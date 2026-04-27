"""
信息过滤智能体节点
继承 BaseNode，集成 FilterAgent 的功能
"""
from typing import Any, Dict
from .base import BaseNode
from ..core.schema import NodeDefinition, WorkflowState
from ..agents.filter_agent import FilterAgent
from ..utils.logger import get_logger

logger = get_logger("filter_agent_node")


class FilterAgentNode(BaseNode):
    """信息过滤智能体节点"""
    
    def __init__(self, node_def: NodeDefinition):
        """
        初始化信息过滤智能体节点
        
        Args:
            node_def: 节点定义
        """
        super().__init__(node_def)
        self.agent = None
        
    def execute(self, state: WorkflowState) -> Dict[str, Any]:
        """
        执行信息过滤
        
        Args:
            state: 工作流状态
            
        Returns:
            过滤后的数据
        """
        logger.info(f"执行信息过滤智能体节点: {self.node_id}")
        
        try:
            # 获取输入数据（支持引用前序节点的输出）
            data_ref = self.get_input_value(state, "data")
            
            # 获取过滤条件
            filters = self.get_input_value(state, "filters") or {}
            sort_by = self.get_input_value(state, "sort_by") or "relevance"
            limit = self.get_input_value(state, "limit") or 100
            
            # 解析输入数据
            if isinstance(data_ref, str) and data_ref.startswith("$"):
                logger.warning(f"数据引用未解析: {data_ref}，请检查配置")
                data = []
            elif isinstance(data_ref, list):
                data = data_ref
            elif isinstance(data_ref, dict) and "collected_data" in data_ref:
                # 如果是数据收集节点的输出
                data = data_ref.get("collected_data", [])
            else:
                logger.warning(f"数据格式不正确: {type(data_ref)}，使用空列表")
                data = []
            
            if not data:
                logger.warning("没有输入数据，返回空结果")
                return {
                    "status": "no_data",
                    "message": "没有输入数据进行过滤",
                    "filtered_data": [],
                    "original_count": 0,
                    "filtered_count": 0
                }
            
            logger.info(f"开始过滤 {len(data)} 条数据")
            
            # 从状态中获取 workflow_id（仅使用数据库主键ID；缺失时降级为不写库）
            workflow_id = state.workflow_id

            # 初始化智能体
            self.agent = FilterAgent(
                workflow_id=workflow_id,
                auto_save=bool(workflow_id)
            )
            
            # 准备过滤条件
            filter_criteria = {
                "keywords": filters.get("keywords", []),
                "time_range": filters.get("time_range", {}),
                "min_confidence": filters.get("min_confidence", 0.5),
                "exclude_duplicates": filters.get("exclude_duplicates", True),
                "sort_by": sort_by,
                "limit": limit
            }
            
            # 执行过滤
            result = self.agent.filter_data(
                data=data,
                filter_criteria=filter_criteria
            )
            
            # 获取过滤后的数据
            filtered_data = result.get("filtered_data", data)
            
            # 应用限制
            if limit and len(filtered_data) > limit:
                filtered_data = filtered_data[:limit]
            
            # 返回结果
            return {
                "status": "success",
                "filtered_data": filtered_data,
                "original_count": len(data),
                "filtered_count": len(filtered_data),
                "filters_applied": filter_criteria,
                "message": f"成功过滤数据，从 {len(data)} 条减少到 {len(filtered_data)} 条"
            }
            
        except Exception as e:
            logger.error(f"信息过滤失败: {e}", exc_info=True)
            return {
                "status": "error",
                "error": str(e),
                "filtered_data": [],
                "original_count": 0,
                "filtered_count": 0
            }