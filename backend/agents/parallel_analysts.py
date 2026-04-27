"""
阶段二：多维深度推理智能体
角色：五个并行执行的维度专家
分析维度：
1. 事件脉络梳理
2. 涉事主体汇总
3. 核心诉求结论
4. 情感流程演变
5. 潜在风险预警
"""

from typing import Dict, Any, List, AsyncIterator
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
import os
import asyncio
from dotenv import load_dotenv

load_dotenv()


def get_llm():
    """获取 LLM 实例"""
    api_key = os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY") or os.getenv("DEEPSEEK_API_KEY")
    
    if os.getenv("DEEPSEEK_API_KEY"):
        # DeepSeek 使用 OpenAI 兼容的 API
        # 支持通过 DEEPSEEK_MODEL 环境变量指定模型，默认为 deepseek-chat
        model_name = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
        return ChatOpenAI(
            model=model_name,
            base_url="https://api.deepseek.com",
            api_key=os.getenv("DEEPSEEK_API_KEY"),
            temperature=0.5
        )
    elif os.getenv("AZURE_OPENAI_API_KEY"):
        from langchain_openai import AzureChatOpenAI
        return AzureChatOpenAI(
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
            api_key=os.getenv("AZURE_OPENAI_API_KEY"),
            api_version="2024-02-15-preview",
            temperature=0.5
        )
    elif os.getenv("OPENAI_API_KEY"):
        return ChatOpenAI(
            model="gpt-4",
            temperature=0.5,
            api_key=api_key
        )
    elif os.getenv("ANTHROPIC_API_KEY"):
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model="claude-3-sonnet-20240229",
            temperature=0.5,
            api_key=api_key
        )
    else:
        raise ValueError("请配置 LLM API Key")


async def analyze_event_context_async(fact_anchor_result: Dict[str, Any], selected_texts: List[str]) -> str:
    """异步版本：维度1：事件脉络梳理"""
    return await asyncio.to_thread(analyze_event_context, fact_anchor_result, selected_texts)

def analyze_event_context(fact_anchor_result: Dict[str, Any], selected_texts: List[str]) -> str:
    """
    维度1：事件脉络梳理
    分析事件的发展过程、关键节点和逻辑关系
    """
    llm = get_llm()
    
    facts_str = f"""
时间线：{fact_anchor_result.get('timeline', [])}
核心当事人：{fact_anchor_result.get('core_parties', [])}
已发生动作：{fact_anchor_result.get('actions', [])}
"""
    
    texts_content = "\n\n".join([f"文本 {i+1}:\n{text}" for i, text in enumerate(selected_texts)])
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """你是一位资深的事件分析专家，擅长梳理复杂事件的来龙去脉。
请基于提供的事实锚定结果，深入分析事件的完整脉络，包括：
- 事件的起因、发展、高潮、转折点
- 各阶段的关键节点和标志性事件
- 事件之间的因果关系和逻辑链条
- 事件发展的可能趋势

请提供详实、专业的分析，避免空话套话。"""),
        ("human", """基于以下事实锚定结果和原始文本，请梳理事件的完整脉络：

事实锚定结果：
{facts}

原始文本：
{texts}

请提供详细的事件脉络分析报告。""")
    ])
    
    chain = prompt | llm | StrOutputParser()
    
    try:
        return chain.invoke({"facts": facts_str, "texts": texts_content})
    except Exception as e:
        return f"事件脉络分析过程中出现错误: {str(e)}"


async def analyze_involved_parties_async(fact_anchor_result: Dict[str, Any], selected_texts: List[str]) -> str:
    """异步版本：维度2：涉事主体汇总"""
    return await asyncio.to_thread(analyze_involved_parties, fact_anchor_result, selected_texts)

def analyze_involved_parties(fact_anchor_result: Dict[str, Any], selected_texts: List[str]) -> str:
    """
    维度2：涉事主体汇总
    分析所有涉及的主体及其角色、立场、关系
    """
    llm = get_llm()
    
    facts_str = f"""
时间线：{fact_anchor_result.get('timeline', [])}
核心当事人：{fact_anchor_result.get('core_parties', [])}
已发生动作：{fact_anchor_result.get('actions', [])}
"""
    
    texts_content = "\n\n".join([f"文本 {i+1}:\n{text}" for i, text in enumerate(selected_texts)])
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """你是一位主体关系分析专家，擅长识别和分析舆情事件中的各类涉事主体。
请详细分析：
- 所有涉事主体的身份、角色和定位
- 各主体的立场、态度和利益诉求
- 主体之间的相互关系（支持、反对、中立等）
- 各主体在事件中的影响力和作用

请提供详实、专业的分析。"""),
        ("human", """基于以下事实锚定结果和原始文本，请汇总分析所有涉事主体：

事实锚定结果：
{facts}

原始文本：
{texts}

请提供详细的涉事主体分析报告。""")
    ])
    
    chain = prompt | llm | StrOutputParser()
    
    try:
        return chain.invoke({"facts": facts_str, "texts": texts_content})
    except Exception as e:
        return f"涉事主体分析过程中出现错误: {str(e)}"


async def analyze_core_demands_async(fact_anchor_result: Dict[str, Any], selected_texts: List[str]) -> str:
    """异步版本：维度3：核心诉求结论"""
    return await asyncio.to_thread(analyze_core_demands, fact_anchor_result, selected_texts)

def analyze_core_demands(fact_anchor_result: Dict[str, Any], selected_texts: List[str]) -> str:
    """
    维度3：核心诉求结论
    分析各方的核心诉求、期望和主张
    """
    llm = get_llm()
    
    facts_str = f"""
时间线：{fact_anchor_result.get('timeline', [])}
核心当事人：{fact_anchor_result.get('core_parties', [])}
已发生动作：{fact_anchor_result.get('actions', [])}
"""
    
    texts_content = "\n\n".join([f"文本 {i+1}:\n{text}" for i, text in enumerate(selected_texts)])
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """你是一位诉求分析专家，擅长从舆情文本中提炼各方的核心诉求。
请深入分析：
- 不同主体的核心诉求和期望
- 诉求的合理性和可行性
- 诉求之间的冲突或一致性
- 诉求背后的深层动机

请提供详实、专业的分析，避免空话套话。"""),
        ("human", """基于以下事实锚定结果和原始文本，请分析核心诉求：

事实锚定结果：
{facts}

原始文本：
{texts}

请提供详细的核心诉求分析报告。""")
    ])
    
    chain = prompt | llm | StrOutputParser()
    
    try:
        return chain.invoke({"facts": facts_str, "texts": texts_content})
    except Exception as e:
        return f"核心诉求分析过程中出现错误: {str(e)}"


async def analyze_emotion_evolution_async(fact_anchor_result: Dict[str, Any], selected_texts: List[str]) -> str:
    """异步版本：维度4：情感流程演变"""
    return await asyncio.to_thread(analyze_emotion_evolution, fact_anchor_result, selected_texts)

def analyze_emotion_evolution(fact_anchor_result: Dict[str, Any], selected_texts: List[str]) -> str:
    """
    维度4：情感流程演变
    分析情感倾向的变化轨迹和影响因素
    """
    llm = get_llm()
    
    facts_str = f"""
时间线：{fact_anchor_result.get('timeline', [])}
核心当事人：{fact_anchor_result.get('core_parties', [])}
已发生动作：{fact_anchor_result.get('actions', [])}
"""
    
    texts_content = "\n\n".join([f"文本 {i+1}:\n{text}" for i, text in enumerate(selected_texts)])
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """你是一位情感分析专家，擅长追踪和分析舆情事件中情感倾向的演变过程。
请深入分析：
- 不同时间点的情感倾向（正面、负面、中性）
- 情感变化的关键转折点
- 影响情感演变的主要因素
- 不同群体的情感差异
- 情感演变的趋势预测

请提供详实、专业的分析。"""),
        ("human", """基于以下事实锚定结果和原始文本，请分析情感流程演变：

事实锚定结果：
{facts}

原始文本：
{texts}

请提供详细的情感演变分析报告。""")
    ])
    
    chain = prompt | llm | StrOutputParser()
    
    try:
        return chain.invoke({"facts": facts_str, "texts": texts_content})
    except Exception as e:
        return f"情感演变分析过程中出现错误: {str(e)}"


async def analyze_risk_warnings_async(fact_anchor_result: Dict[str, Any], selected_texts: List[str]) -> str:
    """异步版本：维度5：潜在风险预警"""
    return await asyncio.to_thread(analyze_risk_warnings, fact_anchor_result, selected_texts)

def analyze_risk_warnings(fact_anchor_result: Dict[str, Any], selected_texts: List[str]) -> str:
    """
    维度5：潜在风险预警
    识别和评估潜在的各类风险
    """
    llm = get_llm()
    
    facts_str = f"""
时间线：{fact_anchor_result.get('timeline', [])}
核心当事人：{fact_anchor_result.get('core_parties', [])}
已发生动作：{fact_anchor_result.get('actions', [])}
"""
    
    texts_content = "\n\n".join([f"文本 {i+1}:\n{text}" for i, text in enumerate(selected_texts)])
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """你是一位风险预警专家，擅长识别和评估舆情事件中的潜在风险。
请深入分析：
- 可能的法律风险
- 可能的社会影响风险
- 可能的品牌/声誉风险
- 可能的连锁反应风险
- 风险的严重程度和发生概率
- 风险防控建议

请提供详实、专业的分析，避免空话套话。"""),
        ("human", """基于以下事实锚定结果和原始文本，请进行潜在风险预警：

事实锚定结果：
{facts}

原始文本：
{texts}

请提供详细的风险预警分析报告。""")
    ])
    
    chain = prompt | llm | StrOutputParser()
    
    try:
        return chain.invoke({"facts": facts_str, "texts": texts_content})
    except Exception as e:
        return f"风险预警分析过程中出现错误: {str(e)}"

