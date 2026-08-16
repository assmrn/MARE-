import os
import numpy as np
import skfuzzy as fuzz
from skfuzzy import control as ctrl
from google import genai
from dotenv import load_dotenv

# ==========================================
# 1. SETUP GEMINI AI
# ==========================================
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY") 
client = genai.Client(api_key=api_key)

# ==========================================
# 2. SETUP FUZZY LOGIC ENGINE
# ==========================================
battery = ctrl.Antecedent(np.arange(0, 101, 1), 'battery')
vibration = ctrl.Antecedent(np.arange(0, 10, 0.1), 'vibration')
risk = ctrl.Consequent(np.arange(0, 101, 1), 'risk')

battery.automf(3)
vibration.automf(3)

risk['low'] = fuzz.trimf(risk.universe, [0, 0, 50])
risk['medium'] = fuzz.trimf(risk.universe, [0, 50, 100])
risk['critical'] = fuzz.trimf(risk.universe, [50, 100, 100])

rule1 = ctrl.Rule(battery['poor'] | vibration['good'], risk['critical'])
rule2 = ctrl.Rule(battery['average'] & vibration['average'], risk['medium'])
rule3 = ctrl.Rule(battery['good'] & vibration['poor'], risk['low'])

risk_ctrl = ctrl.ControlSystem([rule1, rule2, rule3])
reasoning_engine = ctrl.ControlSystemSimulation(risk_ctrl)

# ==========================================
# 3. HELPER FUNCTIONS
# ==========================================
def calculate_fuzzy_risk(current_battery, current_vibration):
    reasoning_engine.input['battery'] = current_battery
    reasoning_engine.input['vibration'] = current_vibration
    reasoning_engine.compute()
    return reasoning_engine.output['risk']

def generate_ai_report(telemetry_data, risk_score, visual_detections):
    prompt = (
        f"You are an aerospace diagnostic AI. The onboard fuzzy logic engine "
        f"calculated a flight risk score of {risk_score:.1f}%. "
        f"Analyze this raw telemetry: {telemetry_data}. "
        f"Additionally, the payload camera has identified the following targets in the field of view: {visual_detections}. "
        f"Correlate the physical telemetry with the visual targets. Identify the root cause of any risks, assess the mission relevance of the detected objects, and output a short, prescriptive flight safety report."
    )
    
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt,
    )
    return response.text

# ==========================================
# 4. MASTER PIPELINE
# ==========================================
def analyze_telemetry(telemetry_data, visual_detections=None):
    if visual_detections is None:
        visual_detections = []
        
    current_batt = telemetry_data.get('battery', 100)
    current_vib = telemetry_data.get('vibration', 0)
    
    fuzzy_risk = calculate_fuzzy_risk(current_batt, current_vib)
    ai_report = generate_ai_report(telemetry_data, fuzzy_risk, visual_detections)
    
    return {
        "calculated_risk_percent": round(fuzzy_risk, 2),
        "ai_analysis": ai_report
    }
