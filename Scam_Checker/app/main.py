from fastapi import FastAPI, WebSocket, WebSocketDisconnect, status, HTTPException
from langchain_core.messages import HumanMessage
from .model_config import llm, LLM_SYSTEM_PROMPT

app = FastAPI()

@app.websocket("/check-scam")
async def check_scam(websocket: WebSocket):
    
    await websocket.accept()
    
    conv_history = []
    user_msg_history = []
    
    try:
        while True:
        
            text_piece = await websocket.receive_text()
            if text_piece:
                conv_history.append({"role": "user", "content": text_piece})
                user_msg_history.append(HumanMessage(content=text_piece))
                
            llm_prompt = [LLM_SYSTEM_PROMPT] + user_msg_history
            result = llm.invoke(llm_prompt)           
            conv_history.append({"role": "assistant", "content": f"The conversation seems {result.final_decision} till now"})
            
            await websocket.send_json({
                "received_chunk": text_piece,
                "current_verdict": result.final_decision,
                "reason": result.reason
            })
                
    except WebSocketDisconnect:
        print("Frontend disconnected")