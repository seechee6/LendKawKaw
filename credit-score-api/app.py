from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
import pickle
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global variables to store model and model info
model = None
model_info = None

def train_model():
    """Train the credit score model using the dataset"""
    
    print("Loading dataset...")
    # Use the exact path to your dataset
    data_path = 'c:/Users/seech/OneDrive/Desktop/web3/Credit Score Classification Dataset.csv'
    data = pd.read_csv(data_path)
    
    # Display basic information about the dataset
    print("Dataset Shape:", data.shape)
    print("Credit Score Distribution:")
    print(data['Credit Score'].value_counts())
    
    # Handle missing values if any
    data = data.dropna()
    
    # Define features and target
    X = data.drop('Credit Score', axis=1)  # All columns except Credit Score
    y = data['Credit Score']               # Target variable
    
    # Identify categorical and numerical columns
    categorical_cols = X.select_dtypes(include=['object']).columns.tolist()
    numerical_cols = X.select_dtypes(include=['int64', 'float64']).columns.tolist()
    
    print("Categorical columns:", categorical_cols)
    print("Numerical columns:", numerical_cols)
    
    # Create preprocessing pipelines
    numerical_transformer = Pipeline(steps=[
        ('scaler', StandardScaler())
    ])
    
    categorical_transformer = Pipeline(steps=[
        ('onehot', OneHotEncoder(handle_unknown='ignore'))
    ])
    
    # Combine preprocessing steps
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numerical_transformer, numerical_cols),
            ('cat', categorical_transformer, categorical_cols)
        ])
    
    # Create and train the model with optimized parameters
    model = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', RandomForestClassifier(
            n_estimators=200,  # More trees for better accuracy
            max_depth=10,      # Limit depth to prevent overfitting
            min_samples_leaf=2,
            random_state=42
        ))
    ])
    
    # Split the data into training and testing sets
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training the model...")
    model.fit(X_train, y_train)
    
    # Evaluate model
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"Model accuracy: {accuracy:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # Save model info for predictions
    model_info = {
        'categorical_cols': categorical_cols,
        'numerical_cols': numerical_cols,
        'all_columns': X.columns.tolist(),
        'classes': model.classes_.tolist(),
        'accuracy': accuracy
    }
    
    # Save the model
    with open('credit_score_model.pkl', 'wb') as file:
        pickle.dump(model, file)
    
    # Save column names for prediction
    with open('model_info.pkl', 'wb') as file:
        pickle.dump(model_info, file)
    
    print("Model saved successfully")
    
    return model, model_info

# Load or train the model at startup
def load_or_train_model():
    global model, model_info
    
    try:
        if os.path.exists('credit_score_model.pkl') and os.path.exists('model_info.pkl'):
            print("Loading existing model...")
            with open('credit_score_model.pkl', 'rb') as file:
                model = pickle.load(file)
            with open('model_info.pkl', 'rb') as file:
                model_info = pickle.load(file)
            print("Model loaded successfully!")
        else:
            print("Model not found. Training a new model...")
            model, model_info = train_model()
    except Exception as e:
        print(f"Error loading model: {e}")
        print("Training a new model...")
        model, model_info = train_model()

# Load or train model at startup
load_or_train_model()

@app.route('/predict', methods=['POST'])
def predict():
    try:
        global model, model_info
        
        if model is None or model_info is None:
            return jsonify({'error': 'Model not loaded or trained'}), 500
        
        data = request.json
        
        # Extract the inputs
        age = data.get('age')
        monthly_salary_rm = data.get('monthlySalary')  # Monthly salary in RM
        education = data.get('education', 'High School')
        
        # Validate inputs
        if not age or not monthly_salary_rm:
            return jsonify({'error': 'Missing required inputs'}), 400
        
        if age < 18 or age > 100:
            return jsonify({'error': 'Age must be between 18 and 100'}), 400
            
        if monthly_salary_rm <= 0:
            return jsonify({'error': 'Monthly salary (RM) must be greater than 0'}), 400
        
        # Convert monthly salary to annual income
        annual_income = monthly_salary_rm * 12
        
        # Create input data dictionary with the features the model expects
        input_data = {
            'Age': age,
            'Income': annual_income
        }
        
        # Handle education mapping to match training data
        if education == "High School":
            input_data['Education'] = "High School Diploma"
        elif education == "Bachelor's Degree":
            input_data['Education'] = "Bachelor's Degree"
        elif education == "Master's Degree":
            input_data['Education'] = "Master's Degree"
        elif education == "Doctorate":
            input_data['Education'] = "Doctorate"
        else:
            input_data['Education'] = "Associate's Degree"
        
        # Add default values for other required features
        input_data['Gender'] = 'Male'
        input_data['Marital Status'] = 'Single'
        input_data['Number of Children'] = 0
        input_data['Home Ownership'] = 'Rented'
        
        # Print what we're feeding to the model for debugging
        print(f"Making prediction with input data: {input_data}")
        
        # Convert to DataFrame
        input_df = pd.DataFrame([input_data])
        
        # Ensure all required columns are present in the correct order
        for col in model_info['all_columns']:
            if col not in input_df.columns:
                input_df[col] = 0
        
        input_df = input_df[model_info['all_columns']]
        
        # Make prediction
        prediction = model.predict(input_df)[0]
        prediction_proba = model.predict_proba(input_df)[0]
        
        # Get the index of the prediction in classes
        pred_index = model_info['classes'].index(prediction)
        confidence = prediction_proba[pred_index] * 100
        
        # Get probabilities for each class
        probabilities = {}
        for i, cls in enumerate(model_info['classes']):
            probabilities[cls] = float(prediction_proba[i] * 100)
        
        # Simple mapping from model prediction to credit score range
        score_mapping = {
            'Low': 350,      # Low scores in the 300-450 range
            'Average': 650,  # Average scores in the 580-670 range
            'High': 780      # High scores in the 700-850 range
        }
        
        # Use the base score directly from the model prediction
        credit_score = score_mapping.get(prediction, 650)
        
        # Determine rating based on prediction class
        rating_mapping = {
            'Low': 'Poor',
            'Average': 'Fair',
            'High': 'Excellent'
        }
        rating = rating_mapping.get(prediction, 'Fair')
        
        print(f"Prediction: {prediction}, Credit Score: {credit_score}, Rating: {rating}")
        
        return jsonify({
            'prediction': prediction,
            'credit_score': credit_score,
            'rating': rating,
            'confidence': float(confidence),
            'probabilities': probabilities,
            'factors': {
                'age': age,
                'monthly_salary_rm': monthly_salary_rm,
                'annual_income': annual_income,
                'education': input_data['Education']
            }
        })
    
    except Exception as e:
        print(f"Error during prediction: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/retrain', methods=['POST'])
def retrain():
    """Endpoint to force model retraining"""
    try:
        global model, model_info
        model, model_info = train_model()
        return jsonify({'message': 'Model retrained successfully', 'accuracy': model_info['accuracy']})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Endpoint to check if the API is up and running"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'classes': model_info['classes'] if model_info else None
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)