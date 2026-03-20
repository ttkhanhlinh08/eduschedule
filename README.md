# App Demo:
https://eduschedule-mu.vercel.app/

# Run Locally

## Full app
1. Download backend & frontend
2. Host backend in virtual env
   `python -m venv venv`
   `venv\Scripts\activate`
   `pip install fastapi uvicorn ortools pydantic`
   `uvicorn main:app --reload`
3. Host frontend
   `npm install`
   `npm run dev`

## Experiments
1. Download local experiments
2. Host locally
   `pip install fastapi uvicorn ortools pydantic`
   `uvicorn main:app --reload`
3. Open FastAPI interface
   `http://127.0.0.1:8000/docs`
4. Try out with datasets
