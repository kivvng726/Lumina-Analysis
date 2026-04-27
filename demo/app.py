"""
基于大语言模型的深度舆情智能分析平台
Streamlit 前端应用
"""

import streamlit as st
import json
import os
from pathlib import Path
from workflow import run_workflow

# 页面配置
st.set_page_config(
    page_title="深度舆情智能分析平台",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# 自定义 CSS 样式
st.markdown("""
<style>
    .data-card {
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 10px;
        background-color: #f9f9f9;
    }
    .data-card:hover {
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .text-preview {
        color: #666;
        font-size: 0.9em;
        max-height: 60px;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .metric-container {
        background-color: #f0f2f6;
        padding: 10px;
        border-radius: 5px;
        margin-bottom: 20px;
    }
</style>
""", unsafe_allow_html=True)


@st.cache_data
def load_data():
    """加载数据文件"""
    data_file = Path("data.json")
    if not data_file.exists():
        return []
    
    try:
        with open(data_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data
    except Exception as e:
        st.error(f"数据加载失败: {str(e)}")
        return []


def format_text_preview(text: str, max_length: int = 100) -> str:
    """格式化文本预览"""
    if len(text) <= max_length:
        return text
    return text[:max_length] + "..."


def main():
    """主函数"""
    st.title("📊 基于大语言模型的深度舆情智能分析平台")
    st.markdown("---")
    
    # 检查 LLM 配置
    from dotenv import load_dotenv
    load_dotenv()
    
    has_llm_config = (
        os.getenv("DEEPSEEK_API_KEY") or
        os.getenv("OPENAI_API_KEY") or 
        os.getenv("ANTHROPIC_API_KEY") or 
        os.getenv("AZURE_OPENAI_API_KEY")
    )
    
    if not has_llm_config:
        st.warning(
            "⚠️ **LLM 未配置**: 请设置环境变量 DEEPSEEK_API_KEY、OPENAI_API_KEY、ANTHROPIC_API_KEY 或 AZURE_OPENAI_API_KEY。"
            "可以在项目根目录创建 .env 文件并添加相应的 API Key。"
        )
    
    # 加载数据
    data = load_data()
    
    if not data:
        st.warning("⚠️ 未找到数据文件 data.json，请确保文件存在于同级目录。")
        return
    
    # 初始化 session state
    if "selected_ids" not in st.session_state:
        st.session_state.selected_ids = set()
    if "report_generated" not in st.session_state:
        st.session_state.report_generated = False
    if "final_report" not in st.session_state:
        st.session_state.final_report = ""
    
    # 左侧栏：数据选择
    with st.sidebar:
        st.header("📋 数据选择")
        
        # 显示选中数量
        selected_count = len(st.session_state.selected_ids)
        st.markdown(f'<div class="metric-container">', unsafe_allow_html=True)
        st.metric("已选中", selected_count, f"共 {len(data)} 条")
        st.markdown(f'</div>', unsafe_allow_html=True)
        
        # 全选/全不选按钮
        col_select_all, col_deselect_all = st.columns(2)
        with col_select_all:
            if st.button("全选", use_container_width=True):
                st.session_state.selected_ids = set(item["id"] for item in data)
                st.rerun()
        with col_deselect_all:
            if st.button("全不选", use_container_width=True):
                st.session_state.selected_ids = set()
                st.rerun()
        
        st.markdown("---")
        
        # 数据卡片列表
        for item in data:
            item_id = item["id"]
            is_selected = item_id in st.session_state.selected_ids
            
            # 创建卡片容器
            with st.container():
                # Checkbox 和基本信息
                checkbox_col, info_col = st.columns([0.15, 0.85])
                
                with checkbox_col:
                    checked = st.checkbox(
                        "",
                        value=is_selected,
                        key=f"checkbox_{item_id}",
                        label_visibility="collapsed"
                    )
                    
                    # 更新选中状态
                    if checked and not is_selected:
                        st.session_state.selected_ids.add(item_id)
                        st.rerun()
                    elif not checked and is_selected:
                        st.session_state.selected_ids.discard(item_id)
                        st.rerun()
                
                with info_col:
                    # 卡片内容
                    st.markdown(f'<div class="data-card">', unsafe_allow_html=True)
                    
                    # 平台和作者
                    platform_emoji = {
                        "微博": "📱",
                        "小红书": "📖",
                        "网易新闻": "📰",
                        "知乎": "💡",
                        "抖音": "🎵"
                    }.get(item.get("platform", ""), "📄")
                    
                    st.markdown(
                        f"**{platform_emoji} {item.get('platform', '未知平台')}** | "
                        f"👤 {item.get('author', '未知作者')}"
                    )
                    
                    # 文本预览
                    text_preview = format_text_preview(item.get("text", ""), max_length=80)
                    st.markdown(f'<div class="text-preview">{text_preview}</div>', unsafe_allow_html=True)
                    
                    # 元数据
                    col_date, col_likes, col_comments = st.columns(3)
                    with col_date:
                        st.caption(f"📅 {item.get('date', '未知日期')}")
                    with col_likes:
                        st.caption(f"👍 {item.get('likes', 0)}")
                    with col_comments:
                        st.caption(f"💬 {item.get('comments_count', 0)}")
                    
                    st.markdown(f'</div>', unsafe_allow_html=True)
    
    # 右侧栏：报告生成（主区域）
    st.header("📝 报告生成")
    
    # 生成报告按钮
    generate_button = st.button(
        "生成深度研判报告",
        type="primary",
        use_container_width=True,
        disabled=selected_count == 0
    )
    
    if selected_count == 0:
        st.warning("⚠️ 请至少选择一条数据进行分析")
    
    # 进度和结果显示区域
    if generate_button and selected_count > 0:
        # 获取选中的文本
        selected_texts = [
            item["text"] for item in data
            if item["id"] in st.session_state.selected_ids
        ]
        
        # 创建进度容器
        progress_container = st.container()
        report_container = st.container()
        
        with progress_container:
            st.markdown("### 分析进度")
            status_placeholder = st.empty()
            progress_bar = st.progress(0)
        
        # 进度回调函数
        current_stage = ""
        
        def progress_callback(stage, message):
            nonlocal current_stage
            current_stage = stage
            # 使用 st.info 显示进度状态（st.status 在回调中不易使用）
            status_placeholder.info(f"**{stage}**: {message}")
            
            # 更新进度条
            stage_progress = {
                "阶段一": 0.2,
                "阶段二": 0.6,
                "阶段三": 0.9,
                "重试": 0.5,  # 重试时回到中间
                "完成": 1.0
            }
            progress_bar.progress(stage_progress.get(stage, 0.5))
        
        # 运行工作流
        try:
            with report_container:
                st.markdown("### 分析结果")
                report_placeholder = st.empty()
                
                # 显示初始状态
                status_placeholder.info("🚀 开始分析...")
                progress_bar.progress(0.1)
                
                # 执行工作流
                final_report = run_workflow(selected_texts, progress_callback)
                
                # 更新最终状态
                status_placeholder.success("✅ 分析完成！")
                progress_bar.progress(1.0)
                
                # 直接使用 markdown 渲染完整报告（更快、更稳定、格式保证正确）
                report_placeholder.markdown(final_report)
                
                # 保存到 session state
                st.session_state.final_report = final_report
                st.session_state.report_generated = True
                
        except Exception as e:
            status_placeholder.error(f"❌ 分析过程中出现错误: {str(e)}")
            st.error(f"错误详情: {str(e)}")
    
    # 如果已有生成的报告，显示它
    elif st.session_state.report_generated and st.session_state.final_report:
        st.markdown("### 分析结果")
        st.markdown(st.session_state.final_report)
        
        # 提供重新生成选项
        if st.button("🔄 重新生成报告"):
            st.session_state.report_generated = False
            st.session_state.final_report = ""
            st.rerun()


if __name__ == "__main__":
    main()

