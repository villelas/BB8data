from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai
import pandas as pd
import io
import json
import os
from dotenv import load_dotenv
from typing import Optional
import sys


load_dotenv()
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://villelas.github.io/BB8data/"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load OpenAI API key
api_key = os.getenv("OPENAI_API_KEY")
openai.api_key = api_key

# Request and response models
class QueryRequest(BaseModel):
    prompt: str

class QueryResponse(BaseModel):
    visualization: Optional[str]
    description: str

# Global variable to store uploaded dataset
uploaded_csv_df = None

# Upload CSV endpoint
@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    global uploaded_csv_df

    try:
        contents = await file.read()
        uploaded_csv_df = pd.read_csv(io.BytesIO(contents))
        print("CSV file successfully uploaded and read.")
        return {"columns": uploaded_csv_df.columns.tolist(), "sample": uploaded_csv_df.head().to_dict(orient="records")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading CSV file: {str(e)}")

def execute_panda_dataframe_code(code: str, user_prompt: str,) -> str:
    old_stdout = sys.stdout
    print("stats function")
    sys.stdout = mystdout = io.StringIO()
   
    try:
        exec(code)
        stats_result = mystdout.getvalue()


        # Prepare prompt for LLM based on the computed stats


        prompt = (
            f"Heres the result of df.describe {stats_result}\n\n"
            f"User request: {user_prompt}\n"
            f"Please provide a consise but clear response show numbers, ignore input that asks visuals that info is produced before this function ."
            f"return user friendly text not code or anything just a simple response. If it asks for something specifc like correlation make sure to actually compute that number."
        )


            # Get LLM's conversational response
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}]
            )
        return response.choices[0].message.content

    except Exception as e:
        sys.stdout = old_stdout
        return f"Error executing code: {repr(e)}"



def detect_multiple_actions(user_prompt: str) -> None:
    """
    Checks for multiple visualization requests by splitting the user prompt on keywords.
    Prints a list of individual prompts for each visualization request instead of returning it.
    """
    # Common conjunctions or keywords to split the prompt for multiple visuals
    split_keywords = [" and ", " also ", " another ", " plus "]
    
    # Attempt splitting based on keywords
    for keyword in split_keywords:
        if keyword in user_prompt.lower():
            split_prompts = [prompt.strip() for prompt in user_prompt.lower().split(keyword)]
            print("Detected multiple prompts:", split_prompts)
            return  split_prompts

    # Print the prompt as a single request if no keywords are found
    print("Single prompt detected:", [user_prompt])
    return [user_prompt]
# Vega-Lite Specification Generation Function
def generate_vega_spec(df: pd.DataFrame, user_prompt: str) -> dict:
    """Generates a Vega-Lite specification based on a dataset and user prompt."""
    print("vega function")
    actions = detect_multiple_actions(user_prompt)
    visual_description = ""
    # Step 1: Check column types and generate info
    columns_info = {
        col: {
            'type': 'quantitative' if pd.api.types.is_numeric_dtype(df[col]) else
                   'nominal' if pd.api.types.is_string_dtype(df[col]) else
                   'temporal' if pd.api.types.is_datetime64_any_dtype(df[col]) else
                   'unknown',
                   'sample_values': df[col].dropna().tolist()[:150]
        }
        for col in df.columns
    }
    
    # Step 2: Construct prompt for generating Vega-Lite specification
    prompt = (
        f"Based on the following dataset columns {df.columns}and their types:\n{columns_info}\n\n"
        f"User request: {user_prompt}\n"
        f"Please generate a Vega-Lite specification for a visualization that meets the user's needs make sure there are plenty of samples to plot for a nice visual."
        f"Only return the JSON format and never return an empty chart."
    )

    try:
        # Step 3: Call OpenAI API for Vega-Lite spec generation
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}]
        )
        vega_lite_spec_str = response.choices[0].message.content.strip()
        
        # Attempt to parse the output as JSON to ensure it is valid
        vega_lite_spec = json.loads(vega_lite_spec_str)

    except json.JSONDecodeError:
        return {"error": "Failed to parse Vega-Lite specification as valid JSON."}
    except Exception as e:
        return {"error": f"OpenAI API error: {str(e)}"}

    if len(actions) == 1:
        # Only a visual summary is requested
        followup_prompt = (
            f"Since this visual is all the user requested, please provide a brief, concise summary of the visual based on: {user_prompt}."
        )
        visual_description_response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": followup_prompt}]
        )
        visual_description = visual_description_response.choices[0].message.content

    else:
        # Multiple actions are detected, provide both visual and statistical summary
        followup_prompt = (
            f"It seems that the user has requested additional statistical information along with the visual. "
            f"Analyze {user_prompt} to determine the additional details. Use the actions split by 'and' for guidance: {actions}."
            f"Goal is to make a new prompt that can be sent to stats function to generate and return."
        )
        new_prompt = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": followup_prompt}]
        )
        
        # Execute the statistical summary code
        stats_code = "print(uploaded_csv_df.describe())"   
        stats_summary = execute_panda_dataframe_code(stats_code, user_prompt)
        
        # Combine both visual description and stats summary if multiple requests are detected
        visual_description = f"{stats_summary}\n\n{visual_description}"

    # Return both the Vega-Lite visualization and the combined description
    return {
        "visualization": vega_lite_spec,
        "description": visual_description
    }



@app.post("/query", response_model=QueryResponse)
async def query_openai(request: QueryRequest):
    if uploaded_csv_df is None:
        return QueryResponse(visualization=None, description="Please upload a dataset for me to work with.")
    
    # Corrected function description for OpenAI's function calling
    vegalite_visuals = {
        "name": "generate_vega_spec",
        "description": (
            "Generates a Vega-Lite JSON specification for data visualization based on what type of graph or chart the user wants, It will also take a descrition of something particular the user wants an additonal summary to."
            "This function interprets the dataset's column types to ensure the visualization aligns with the user's request. "
            "Expected output should be JSON in Vega-Lite format."
            "choose if theres content regarding histograms, scatter plots, bar charts, line charts, pie charts, box plots, or any other type of chart or graph."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "data": {
                    "type": "object",
                    "description": "The dataset as a DataFrame object, allowing direct column access within the function."
                },
                "user_prompt": {
                    "type": "string",
                    "description": "User's request for the desired visualization, describing fields to visualize and chart type."
                }
            },
            "required": ["data", "user_prompt"]
        }
    }
    text_stats_summary = {
    "name": "generate_stats_summary",
    "description": "Generate a statistical summary of the dataset based on user-provided prompt.",
    "parameters": {
        "type": "object",
        "properties": {
            "data": {
                "type": "object",
                "description": "The dataset as a DataFrame."
            },
            "user_prompt": {
                "type": "string",
                "description": "Description of the statistics requested."
            }
        },
        "required": ["data", "user_prompt"]
    }
}

    # Call the OpenAI API with function calling enabled
    try:
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": request.prompt}],
            functions=[vegalite_visuals, text_stats_summary],  
            function_call="auto"  # Allow the model to decide whether to call the function
        )

        # Check if the model chose to call the function
        if response.choices[0].finish_reason == "function_call":
            function_name = response.choices[0].message.function_call.name

            if function_name == "generate_vega_spec":
                result = generate_vega_spec(uploaded_csv_df, request.prompt)
                return QueryResponse(visualization=json.dumps(result["visualization"]), description=result["description"])

            elif function_name == "generate_stats_summary":
                stats_code = "print(uploaded_csv_df.describe())"  
                stats_summary = execute_panda_dataframe_code(stats_code, request.prompt)
                return QueryResponse(visualization=None, description=stats_summary)

        else:
            return QueryResponse(visualization=None, description=response.choices[0].message.content)
           
        

    except Exception as e:
        return QueryResponse(visualization=None, description=f"The requested visualization could not be generated due to formatting issues")


@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    return {"message": "Welcome to the FastAPI Backend"}
