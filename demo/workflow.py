"""
LangGraph 工作流编排
实现三阶段多智能体工作流：
1. 事实锚定
2. 并行五维分析
3. 逻辑交叉校验（带重试机制）
"""

from typing import TypedDict, List, Dict, Any, Optional, Callable
from langgraph.graph import StateGraph, END
import asyncio

from agents.fact_anchor import fact_anchor_agent
from agents.parallel_analysts import (
    analyze_event_context_async,
    analyze_involved_parties_async,
    analyze_core_demands_async,
    analyze_emotion_evolution_async,
    analyze_risk_warnings_async
)
from agents.consistency_checker import consistency_checker_agent, generate_final_report


class WorkflowState(TypedDict):
    """工作流状态定义"""
    selected_texts: List[str]  # 选中的文本
    fact_anchor_result: Dict[str, Any]  # 事实锚定结果
    parallel_results: Dict[str, str]  # 五维分析结果
    consistency_check: bool  # 一致性检查结果
    consistency_issues: str  # 一致性问题描述
    final_report: str  # 最终报告
    retry_count: int  # 重试次数
    current_stage: str  # 当前阶段


def fact_anchor_node(state: WorkflowState) -> WorkflowState:
    """阶段一：事实锚定节点"""
    print("🔍 阶段一：事实锚定 Agent 正在工作...")
    
    result = fact_anchor_agent(state["selected_texts"])
    
    return {
        **state,
        "fact_anchor_result": result,
        "current_stage": "fact_anchor_completed"
    }


def parallel_analysis_node(state: WorkflowState) -> WorkflowState:
    """阶段二：并行五维分析节点（使用异步并行执行）"""
    print("📊 阶段二：五维并行分析正在进行...")
    
    fact_result = state["fact_anchor_result"]
    selected_texts = state["selected_texts"]
    
    # 使用 asyncio.gather 真正并行执行五个维度的分析
    async def run_parallel_analysis():
        results = await asyncio.gather(
            analyze_event_context_async(fact_result, selected_texts),
            analyze_involved_parties_async(fact_result, selected_texts),
            analyze_core_demands_async(fact_result, selected_texts),
            analyze_emotion_evolution_async(fact_result, selected_texts),
            analyze_risk_warnings_async(fact_result, selected_texts),
            return_exceptions=True
        )
        
        return {
            "event_context": results[0] if not isinstance(results[0], Exception) else f"分析过程中出现错误: {str(results[0])}",
            "involved_parties": results[1] if not isinstance(results[1], Exception) else f"分析过程中出现错误: {str(results[1])}",
            "core_demands": results[2] if not isinstance(results[2], Exception) else f"分析过程中出现错误: {str(results[2])}",
            "emotion_evolution": results[3] if not isinstance(results[3], Exception) else f"分析过程中出现错误: {str(results[3])}",
            "risk_warnings": results[4] if not isinstance(results[4], Exception) else f"分析过程中出现错误: {str(results[4])}",
        }
    
    # 运行异步函数
    results = asyncio.run(run_parallel_analysis())
    
    return {
        **state,
        "parallel_results": results,
        "current_stage": "parallel_analysis_completed"
    }


def consistency_check_node(state: WorkflowState) -> WorkflowState:
    """阶段三：逻辑交叉校验节点"""
    print("✅ 阶段三：逻辑交叉校验 Agent 正在工作...")
    
    fact_result = state["fact_anchor_result"]
    parallel_results = state["parallel_results"]
    
    is_consistent, final_report, issues = consistency_checker_agent(
        fact_result,
        parallel_results
    )
    
    return {
        **state,
        "consistency_check": is_consistent,
        "consistency_issues": issues,
        "final_report": final_report if is_consistent else "",
        "current_stage": "consistency_check_completed"
    }


def should_retry(state: WorkflowState) -> str:
    """判断是否应该重试"""
    max_retries = 1  # 降低重试次数，避免耗时过长
    
    if state["consistency_check"]:
        return "pass"
    elif state["retry_count"] >= max_retries:
        return "force_generate"
    else:
        return "retry"


def retry_node(state: WorkflowState) -> WorkflowState:
    """重试节点：回退到并行分析阶段"""
    print(f"🔄 检测到逻辑不一致，进行第 {state['retry_count'] + 1} 次重试...")
    print(f"发现的问题：{state['consistency_issues']}")
    
    return {
        **state,
        "retry_count": state["retry_count"] + 1,
        "current_stage": "retrying"
    }


def force_generate_node(state: WorkflowState) -> WorkflowState:
    """强制生成节点：超过重试次数后强制生成报告"""
    print("⚠️ 已达到最大重试次数，强制生成最终报告...")
    
    fact_result = state["fact_anchor_result"]
    parallel_results = state["parallel_results"]
    
    final_report = generate_final_report(
        fact_result,
        parallel_results,
        force_generate=True
    )
    
    return {
        **state,
        "final_report": final_report,
        "current_stage": "completed"
    }


def create_workflow():
    """创建并返回工作流图"""
    # 创建状态图
    workflow = StateGraph(WorkflowState)
    
    # 添加节点
    workflow.add_node("fact_anchor", fact_anchor_node)
    workflow.add_node("parallel_analysis", parallel_analysis_node)
    workflow.add_node("consistency_check", consistency_check_node)
    workflow.add_node("retry", retry_node)
    workflow.add_node("force_generate", force_generate_node)
    
    # 设置入口点
    workflow.set_entry_point("fact_anchor")
    
    # 添加边
    workflow.add_edge("fact_anchor", "parallel_analysis")
    workflow.add_edge("parallel_analysis", "consistency_check")
    
    # 条件边：根据一致性检查结果决定下一步
    workflow.add_conditional_edges(
        "consistency_check",
        should_retry,
        {
            "pass": END,
            "retry": "retry",
            "force_generate": "force_generate"
        }
    )
    
    # 重试后回到并行分析
    workflow.add_edge("retry", "parallel_analysis")
    
    # 强制生成后结束
    workflow.add_edge("force_generate", END)
    
    # 编译工作流
    app = workflow.compile()
    
    return app


def run_workflow(selected_texts: List[str], progress_callback=None, stream_callback=None) -> str:
    """
    运行工作流
    
    Args:
        selected_texts: 选中的文本列表
        progress_callback: 进度回调函数，接收 (stage, message) 参数
        
    Returns:
        最终报告（Markdown格式）
    """
    app = create_workflow()
    
    # 初始化状态
    initial_state: WorkflowState = {
        "selected_texts": selected_texts,
        "fact_anchor_result": {},
        "parallel_results": {},
        "consistency_check": False,
        "consistency_issues": "",
        "final_report": "",
        "retry_count": 0,
        "current_stage": "initialized"
    }
    
    # 运行工作流
    final_state = initial_state.copy()
    try:
        for state_update in app.stream(initial_state):
            # LangGraph 返回的 state_update 是一个字典，键是节点名，值是状态更新
            # 我们需要合并所有状态更新
            for node_name, node_state in state_update.items():
                if isinstance(node_state, dict):
                    final_state.update(node_state)
            
            # 调用进度回调
            if progress_callback:
                stage = final_state.get("current_stage", "processing")
                if stage == "fact_anchor_completed":
                    progress_callback("阶段一", "事实锚定完成，正在进入并行分析阶段...")
                elif stage == "parallel_analysis_completed":
                    progress_callback("阶段二", "五维并行分析完成，正在进行逻辑交叉校验...")
                elif stage == "consistency_check_completed":
                    if final_state.get("consistency_check"):
                        progress_callback("阶段三", "逻辑交叉校验通过，生成最终报告...")
                    else:
                        progress_callback("阶段三", f"检测到逻辑不一致，准备重试... (第{final_state.get('retry_count', 0)}次)")
                elif stage == "retrying":
                    progress_callback("重试", "回退专家组重写分析结果...")
                elif stage == "completed":
                    progress_callback("完成", "报告生成完成！")
        
        # 获取最终报告
        final_report = final_state.get("final_report", "")
        if final_report:
            return final_report
        else:
            # 如果没有最终报告，尝试强制生成
            if final_state.get("parallel_results") and final_state.get("fact_anchor_result"):
                from agents.consistency_checker import generate_final_report
                return generate_final_report(
                    final_state["fact_anchor_result"],
                    final_state["parallel_results"],
                    force_generate=True
                )
            return "报告生成失败，请重试。"
            
    except Exception as e:
        import traceback
        error_msg = f"工作流执行出错: {str(e)}\n{traceback.format_exc()}"
        return error_msg

