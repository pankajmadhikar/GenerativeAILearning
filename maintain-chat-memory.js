import dotenv from 'dotenv';
import {ChatGoogleGenerativeAI} from '@langchain/google-genai';
import { HumanMessage } from '@langchain/core/messages';
dotenv.config();

const googleModel = new ChatGoogleGenerativeAI({
    model:"gemini-3.1-flash-lite-preview",
    apiKey:process.env.GOOGLE_API_KEY
})

// const aiAnswer = async (qsn)=>{
//     const response = await googleModel.invoke([ 
//         new HumanMessage(qsn)
//     ])
//     console.log(response.content)
// }

const content = [
    {role:"system", content:"keep your answer short and concise"},
]

const aiAnswer = async (qsn)=>{
    content.push({role:"user", content:qsn})
    const response = await googleModel.invoke(content)
    content.push({role:"assistant", content:response.content})
    console.log(response.content, response.usage_metadata)
}

process.stdout.write("Ask any question :")
process.stdin.on("data", (data)=>{
    const qsn = data.toString().trim()
    if(qsn === "exit"){
        process.exit()
    }else{
        aiAnswer(qsn)
    }
})