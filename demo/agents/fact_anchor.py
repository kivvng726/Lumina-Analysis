"""
阶段一：事实锚定智能体
角色：首席事实官
任务：提取客观时间线、核心当事人、已发生动作
"""

from typing import Dict, List, Any
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
import os
from dotenv import load_dotenv

load_dotenv()


def get_llm():
    """获取 LLM 实例，支持多种配置方式"""
    api_key = os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY") or os.getenv("DEEPSEEK_API_KEY")
    
    if os.getenv("DEEPSEEK_API_KEY"):
        # DeepSeek 使用 OpenAI 兼容的 API
        # 支持通过 DEEPSEEK_MODEL 环境变量指定模型，默认为 deepseek-chat
        model_name = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
        return ChatOpenAI(
            model=model_name,
            base_url="https://api.deepseek.com",
            api_key=os.getenv("DEEPSEEK_API_KEY"),
            temperature=0.3
        )
    elif os.getenv("AZURE_OPENAI_API_KEY"):
        from langchain_openai import AzureChatOpenAI
        return AzureChatOpenAI(
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
            api_key=os.getenv("AZURE_OPENAI_API_KEY"),
            api_version="2024-02-15-preview",
            temperature=0.3
        )
    elif os.getenv("OPENAI_API_KEY"):
        return ChatOpenAI(
            model="gpt-4",
            temperature=0.3,
            api_key=api_key
        )
    elif os.getenv("ANTHROPIC_API_KEY"):
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model="claude-3-sonnet-20240229",
            temperature=0.3,
            api_key=api_key
        )
    else:
        # 默认使用 OpenAI，如果未配置则抛出错误
        raise ValueError("请配置 LLM API Key (DEEPSEEK_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, 或 AZURE_OPENAI_API_KEY)")


def fact_anchor_agent(selected_texts: List[str]) -> Dict[str, Any]:
    """
    事实锚定智能体
    
    Args:
        selected_texts: 选中的文本数据列表
        
    Returns:
        结构化事实字典，包含：
        - timeline: 时间线列表
        - core_parties: 核心当事人列表
        - actions: 已发生动作列表
    """
    llm = get_llm()
    
    # 构建输入文本
    texts_content = "\n\n".join([f"文本 {i+1}:\n{text}" for i, text in enumerate(selected_texts)])
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """你是一位严谨的首席事实官，专门负责从舆情文本中提取客观事实。
你的任务是识别和提取以下三类信息，必须严格基于文本内容，不得添加任何主观推测：

1. **时间线**：按时间顺序列出所有明确提及的时间点和事件
2. **核心当事人**：识别涉及的主要人物、机构、组织等实体
3. **已发生动作**：提取文本中明确描述的行为和事件，必须是已经发生的事实

请以结构化格式输出，确保所有信息都有文本依据。"""),
        ("human", """请从以下舆情文本中提取客观事实：

{texts}

请按照以下 JSON 格式输出：
{{
    "timeline": [
        {{"time": "时间点", "event": "事件描述"}},
        ...
    ],
    "core_parties": [
        "当事人1",
        "当事人2",
        ...
    ],
    "actions": [
        "已发生的动作1",
        "已发生的动作2",
        ...
    ]
}}""")
    ])
    
    chain = prompt | llm | StrOutputParser()
    
    try:
        result_text = chain.invoke({"texts": texts_content})
        
        # 尝试解析 JSON（如果 LLM 返回的是 JSON）
        import json
        import re
        
        # 提取 JSON 部分
        json_match = re.search(r'\{[\s\S]*\}', result_text)
        if json_match:
            result_dict = json.loads(json_match.group())
        else:
            # 如果无法解析 JSON，返回原始文本的结构化版本
            result_dict = {
                "timeline": [],
                "core_parties": [],
                "actions": [],
                "raw_analysis": result_text
            }
        
        return {
            "timeline": result_dict.get("timeline", []),
            "core_parties": result_dict.get("core_parties", []),
            "actions": result_dict.get("actions", []),
            "raw_analysis": result_text
        }
    except Exception as e:
        # 错误处理：返回基本结构
        return {
            "timeline": [],
            "core_parties": [],
            "actions": [],
            "error": str(e),
            "raw_analysis": f"事实提取过程中出现错误: {str(e)}"
        }

