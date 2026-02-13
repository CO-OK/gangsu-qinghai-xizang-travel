# ============================================================
# 青甘西藏自驾行程 - Makefile
# ============================================================

PORT := 3000
URL := http://localhost:$(PORT)
PID_FILE := .server.pid

# 默认目标
.PHONY: run
run: start
	@echo "✅ 服务器已启动: $(URL)"
	@echo "   按 Ctrl+C 停止服务器"

# 启动服务器并打开网页
.PHONY: start
start:
	@if lsof -ti:$(PORT) > /dev/null 2>&1; then \
		echo "⚠️  端口 $(PORT) 已被占用，服务器可能已在运行"; \
		echo "   访问 $(URL) 查看"; \
	else \
		echo "🚀 启动服务器..."; \
		cd server && node server.js & \
		echo $$! > $(PID_FILE); \
		sleep 2; \
		open $(URL); \
	fi

# 停止服务器
.PHONY: stop
stop:
	@if [ -f $(PID_FILE) ]; then \
		PID=$$(cat $(PID_FILE)); \
		if kill $$PID 2>/dev/null; then \
			echo "🛑 服务器已停止"; \
		else \
			echo "⚠️  无法停止进程 $$PID"; \
		fi; \
		rm -f $(PID_FILE); \
	elif lsof -ti:$(PORT) > /dev/null 2>&1; then \
		kill $$(lsof -ti:$(PORT)) 2>/dev/null && echo "🛑 服务器已停止" || echo "⚠️  停止失败"; \
	else \
		echo "ℹ️  服务器未运行"; \
	fi

# 重启服务器
.PHONY: restart
restart: stop
	@echo "🔄 重启服务器..."
	@sleep 1
	$(MAKE) start

# 检查服务器状态
.PHONY: status
status:
	@if lsof -ti:$(PORT) > /dev/null 2>&1; then \
		echo "✅ 服务器正在运行"; \
		echo "   访问 $(URL)"; \
	else \
		echo "❌ 服务器未运行"; \
		echo "   运行 make run 启动"; \
	fi

# 查看服务器日志（最后 20 行）
.PHONY: logs
logs:
	@if lsof -ti:$(PORT) > /dev/null 2>&1; then \
		echo "📋 服务器日志 (Ctrl+C 退出):"; \
		tail -f /dev/null 2>/dev/null || echo "(日志需在终端查看)"; \
	else \
		echo "❌ 服务器未运行"; \
	fi

# 测试 API 端点
.PHONY: test-api
test-api:
	@echo "🧪 测试 API..."
	@echo ""
	@echo "1. GET /api/trip-data:"
	@curl -s $(URL)/api/trip-data | head -c 200
	@echo ""
	@echo ""
	@echo "2. POST /api/expenses/D1 (添加测试开销):"
	@curl -s -X POST $(URL)/api/expenses/D1 \
		-H "Content-Type: application/json" \
		-d '{"item":"测试","amount":100}' | head -c 100
	@echo ""

# 显示帮助信息
.PHONY: help
help:
	@echo "📋 青甘西藏自驾行程 - Makefile"
	@echo ""
	@echo "可用命令:"
	@echo "  make run      启动服务器并打开网页"
	@echo "  make start    仅启动服务器（不打开网页）"
	@echo "  make stop     停止服务器"
	@echo "  make restart  重启服务器"
	@echo "  make status   检查服务器状态"
	@echo "  make test-api 测试 API 端点"
	@echo "  make help     显示此帮助信息"
	@echo ""
	@echo "访问 $(URL) 查看应用"
