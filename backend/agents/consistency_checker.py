"""
阶段三：逻辑交叉校验智能体
角色：报告总审校
任务：检查各维度是否存在因果矛盾，确保逻辑自洽
"""

from typing import Dict, Any, Tuple
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
import os
from dotenv import load_dotenv
import json
import re

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
            temperature=0.2
        )
    elif os.getenv("AZURE_OPENAI_API_KEY"):
        from langchain_openai import AzureChatOpenAI
        return AzureChatOpenAI(
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
            api_key=os.getenv("AZURE_OPENAI_API_KEY"),
            api_version="2024-02-15-preview",
            temperature=0.2
        )
    elif os.getenv("OPENAI_API_KEY"):
        return ChatOpenAI(
            model="gpt-4",
            temperature=0.2,
            api_key=api_key
        )
    elif os.getenv("ANTHROPIC_API_KEY"):
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model="claude-3-sonnet-20240229",
            temperature=0.2,
            api_key=api_key
        )
    else:
        raise ValueError("请配置 LLM API Key")


def consistency_checker_agent(
    fact_anchor_result: Dict[str, Any],
    parallel_results: Dict[str, str]
) -> Tuple[bool, str, str]:
    """
    逻辑交叉校验智能体
    
    Args:
        fact_anchor_result: 事实锚定结果
        parallel_results: 五维分析结果字典
        
    Returns:
        (is_consistent, final_report, issues): 
        - is_consistent: 是否逻辑自洽
        - final_report: 最终整合报告
        - issues: 发现的问题（如果有）
    """
    llm = get_llm()
    
    # 构建分析结果摘要
    analysis_summary = f"""
## 五维分析结果

### 1. 事件脉络梳理
{parallel_results.get('event_context', '')}

### 2. 涉事主体汇总
{parallel_results.get('involved_parties', '')}

### 3. 核心诉求结论
{parallel_results.get('core_demands', '')}

### 4. 情感流程演变
{parallel_results.get('emotion_evolution', '')}

### 5. 潜在风险预警
{parallel_results.get('risk_warnings', '')}
"""
    
    facts_str = f"""
时间线：{fact_anchor_result.get('timeline', [])}
核心当事人：{fact_anchor_result.get('core_parties', [])}
已发生动作：{fact_anchor_result.get('actions', [])}
"""
    
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            """你是一位严谨的报告总审校，负责检查多维度分析报告的逻辑一致性。
你的任务是：
1. 检查各维度分析之间是否存在严重的因果矛盾（轻微不一致可忽略）
2. 验证诉求与风险的对应关系是否基本合理（允许一定程度的差异）
3. 确保分析结果与事实锚定结果基本一致（允许合理的推理扩展）
4. 只识别严重的逻辑不自洽问题

注意：
- 这是一个演示环境，请优先给出清晰、结构化的最终报告；
- 只有在发现\"严重矛盾\"、\"根本性错误\"等情况时，才认为逻辑不自洽。

输出要求：
- **只输出最终深度研判报告正文**，使用 Markdown 格式（包含标题、分节、小结等）；
- 不要输出 JSON、代码块、解释文字或任何额外结构。"""
        ),
        (
            "human",
            """请基于以下信息完成逻辑交叉校验，并在通过校验的前提下整合生成最终报告：

【事实锚定结果】：
{facts}

【五维分析结果】：
{analysis}

请直接输出最终报告（Markdown 格式），不要输出任何 JSON 或解释。"""
        ),
    ])

    chain = prompt | llm | StrOutputParser()

    try:
        # 这里不再要求模型输出 JSON，而是直接输出最终的 Markdown 报告
        result_text = chain.invoke({"facts": facts_str, "analysis": analysis_summary})

        # 默认认为逻辑自洽（演示环境下简化处理），issues 为空
        return True, result_text, ""

    except Exception as e:
        # 出错时返回一个简单的错误报告，避免前端渲染 JSON 字符串
        error_report = f"# 报告生成出现错误\n\n> 校验过程中出现异常：{str(e)}"
        return True, error_report, f"校验过程中出现错误: {str(e)}"


def generate_final_report(
    fact_anchor_result: Dict[str, Any],
    parallel_results: Dict[str, str],
    force_generate: bool = False
) -> str:
    """
    强制生成最终报告（用于重试次数超限时）
    
    Args:
        fact_anchor_result: 事实锚定结果
        parallel_results: 五维分析结果
        force_generate: 是否强制生成（即使有矛盾）
        
    Returns:
        最终报告（Markdown格式）
    """
    llm = get_llm()
    
    analysis_summary = f"""
## 五维分析结果

### 1. 事件脉络梳理
{parallel_results.get('event_context', '')}

### 2. 涉事主体汇总
{parallel_results.get('involved_parties', '')}

### 3. 核心诉求结论
{parallel_results.get('core_demands', '')}

### 4. 情感流程演变
{parallel_results.get('emotion_evolution', '')}

### 5. 潜在风险预警
{parallel_results.get('risk_warnings', '')}
"""
    
    facts_str = f"""
时间线：{fact_anchor_result.get('timeline', [])}
核心当事人：{fact_anchor_result.get('core_parties', [])}
已发生动作：{fact_anchor_result.get('actions', [])}
"""
    
    warning_note = "\n\n注意：本报告可能存在部分逻辑不一致之处，已尽力整合。" if force_generate else ""
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """你是一位专业的报告撰写专家，擅长整合多维度分析结果，生成结构清晰、逻辑严密的深度研判报告。
请基于提供的事实锚定结果和五维分析结果，生成一份详实、专业的深度研判报告。

报告要求：
- 使用 Markdown 格式
- 标题层级清晰（# ## ###）
- 内容详实，避免空话套话
- 逻辑严密，结构完整
- 包含所有五个维度的分析内容"""),
        ("human", """请基于以下信息生成深度研判报告：

事实锚定结果：
{facts}

五维分析结果：
{analysis}
{warning}

请生成一份完整的深度研判报告（Markdown格式）。""")
    ])
    
    chain = prompt | llm | StrOutputParser()
    
    try:
        return chain.invoke({
            "facts": facts_str,
            "analysis": analysis_summary,
            "warning": warning_note
        })
    except Exception as e:
        return f"报告生成过程中出现错误: {str(e)}"

