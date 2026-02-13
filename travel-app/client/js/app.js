/**
 * 渲染层
 * 从 store 获取数据，生成完整页面
 */

(function () {
  "use strict";

  // ============ 工具函数 ============

  /** 创建 DOM 元素的简洁封装 */
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "className") node.className = attrs[k];
        else if (k === "style" && typeof attrs[k] === "object") {
          Object.assign(node.style, attrs[k]);
        } else if (k === "html") node.innerHTML = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (k.startsWith("on")) node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else node.setAttribute(k, attrs[k]);
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (typeof c === "string") node.appendChild(document.createTextNode(c));
        else if (c) node.appendChild(c);
      });
    }
    return node;
  }

  /** 格式化金额 */
  function fmtMoney(n) {
    if (n === 0) return "0.00";
    return n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /** 某天的开销总计 */
  function dayTotal(day) {
    return (day.expenses || []).reduce(function (s, e) { return s + (e.amount || 0); }, 0);
  }

  // ============ 渲染：Header ============

  function renderHeader(data) {
    const header = document.getElementById("site-header");
    header.innerHTML = "";

    // 地图按钮
    header.appendChild(el("a", {
      href: "map.html",
      className: "header-map-btn",
      target: "_blank",
      title: "在新窗口打开地图",
      text: "🗺️ 查看地图",
    }));

    header.appendChild(el("h1", { text: data.title }));

    const totalExpense = store.getTotalExpense();

    const stats = el("div", { className: "stats-bar" }, [
      statItem(data.totalDays + " 天", "总天数"),
      statItem(data.totalDistance, "总里程"),
      statItem("7 段", "行程阶段"),
      statItem("¥" + fmtMoney(totalExpense), "已记录开销"),
    ]);
    header.appendChild(stats);
  }

  function statItem(value, label) {
    return el("div", { className: "stat-item" }, [
      el("span", { className: "stat-value", text: value }),
      el("span", { className: "stat-label", text: label }),
    ]);
  }

  // ============ 渲染：Phase Navigation ============

  function renderPhaseNav(data) {
    const nav = document.getElementById("phase-nav");
    nav.innerHTML = "";

    data.phases.forEach(function (phase) {
      const tab = el("div", {
        className: "phase-tab",
        text: phase.name,
        style: { "--tab-color": phase.color },
        onClick: function () {
          const target = document.getElementById("phase-" + phase.id);
          if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        },
      });
      tab.dataset.phaseId = phase.id;
      nav.appendChild(tab);
    });

    setupScrollSpy();
  }

  function setupScrollSpy() {
    const sections = document.querySelectorAll(".phase-section");
    if (!sections.length) return;

    const tabs = document.querySelectorAll(".phase-tab");

    function update() {
      const scrollY = window.scrollY + 120;
      let current = null;
      sections.forEach(function (sec) {
        // 使用 getBoundingClientRect 获取相对于文档的绝对位置
        const sectionTop = sec.getBoundingClientRect().top + window.scrollY;
        if (sectionTop <= scrollY) current = sec.dataset.phaseId;
      });
      tabs.forEach(function (tab) {
        tab.classList.toggle("active", tab.dataset.phaseId === current);
      });
    }

    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  // ============ 渲染：Timeline ============

  function renderTimeline(data) {
    const container = document.getElementById("timeline");
    container.innerHTML = "";

    const groups = store.getDaysByPhase();

    data.phases.forEach(function (phase) {
      const days = groups[phase.id];
      if (!days || !days.length) return;

      const section = el("div", { className: "phase-section", id: "phase-" + phase.id });
      section.dataset.phaseId = String(phase.id);

      // Phase header
      section.appendChild(el("div", { className: "phase-header" }, [
        el("span", {
          className: "phase-badge",
          style: { background: phase.color },
          text: phase.name,
        }),
        el("span", { className: "phase-days-label", text: phase.days }),
      ]));

      // Day cards
      days.forEach(function (day) {
        section.appendChild(renderDayCard(day, phase));
      });

      container.appendChild(section);
    });
  }

  function renderDayCard(day, phase) {
    const card = el("div", { className: "day-card", style: { borderLeftColor: phase.color } });

    // Top: tag + info
    const tag = el("div", { className: "day-tag", style: { background: phase.color } }, [
      el("span", { className: "day-tag-id", text: day.id }),
      el("span", { className: "day-tag-date", text: day.date }),
    ]);

    const meta = el("div", { className: "day-meta" }, [
      day.distance && day.distance !== "0km" ? el("span", { className: "meta-distance", text: day.distance }) : null,
      el("span", { className: "meta-elevation", text: "海拔 " + day.elevation }),
      el("span", { className: "meta-stay", text: day.stay }),
    ]);

    const info = el("div", { className: "day-info" }, [
      el("div", { className: "day-route", text: day.route }),
      meta,
    ]);

    card.appendChild(el("div", { className: "day-card-top" }, [tag, info]));

    // Spots
    if (day.spots && day.spots.length) {
      const spotsList = el("ul", { className: "spots-list" });
      day.spots.forEach(function (spot, i) {
        spotsList.appendChild(el("li", { className: "spot-chip" }, [
          el("span", { className: "spot-index", text: String(i + 1) }),
          document.createTextNode(spot),
        ]));
      });

      const spotsSection = el("div", { className: "day-spots" }, [
        el("div", { className: "day-spots-title", text: "景点" }),
        spotsList,
      ]);
      card.appendChild(spotsSection);
    }

    // Expenses
    card.appendChild(renderDayExpenses(day));

    return card;
  }

  function renderDayExpenses(day) {
    const total = dayTotal(day);
    const expenses = day.expenses || [];
    const isEmpty = expenses.length === 0;

    const wrapper = el("div", { className: "day-expenses" + (isEmpty ? " empty" : "") });

    const header = el("div", { className: "expenses-header" }, [
      el("span", { className: "expenses-title", text: "开销明细" }),
      !isEmpty ? el("span", { className: "expenses-total-badge", text: "¥" + fmtMoney(total) }) : null,
    ]);
    wrapper.appendChild(header);

    const table = el("table", { className: "expenses-table" });

    // thead
    const thead = el("thead", null, [
      el("tr", null, [
        el("th", { text: "项目" }),
        el("th", { text: "金额" }),
        el("th", { className: "th-actions", text: "操作" }),
      ]),
    ]);
    table.appendChild(thead);

    // tbody
    const tbody = el("tbody");
    if (isEmpty) {
      tbody.appendChild(el("tr", null, [
        el("td", { className: "no-expense-hint", colspan: "3" }, [
          document.createTextNode("暂无开销记录"),
          el("button", {
            className: "btn-add-expense-inline",
            text: "+ 添加",
            onClick: function () { openExpenseModal(day.id, -1); },
          }),
        ]),
      ]));
    } else {
      expenses.forEach(function (exp, idx) {
        tbody.appendChild(el("tr", null, [
          el("td", { text: exp.item }),
          el("td", { text: "¥" + fmtMoney(exp.amount || 0) }),
          el("td", { className: "expense-actions" }, [
            el("button", {
              className: "btn-edit",
              text: "编辑",
              onClick: function () { openExpenseModal(day.id, idx, exp); },
            }),
            el("button", {
              className: "btn-delete",
              text: "删除",
              onClick: function () { deleteExpense(day.id, idx, exp.item); },
            }),
          ]),
        ]));
      });
    }
    table.appendChild(tbody);

    // tfoot
    if (!isEmpty) {
      const tfoot = el("tfoot", null, [
        el("tr", null, [
          el("td", { colSpan: "2" }, [
            el("button", {
              className: "btn-add-expense-inline",
              text: "+ 添加开销",
              onClick: function () { openExpenseModal(day.id, -1); },
            }),
          ]),
          el("td", { className: "tfoot-amount" }, [
            el("span", { text: "小计 " }),
            el("span", { className: "tfoot-total", text: "¥" + fmtMoney(total) }),
          ]),
        ]),
      ]);
      table.appendChild(tfoot);
    }

    wrapper.appendChild(table);
    return wrapper;
  }

  // ============ 渲染：Expense Summary ============

  function renderExpenseSummary(data) {
    const container = document.getElementById("expense-summary");
    container.innerHTML = "";

    container.appendChild(el("h2", { text: "开销汇总" }));

    const groups = store.getDaysByPhase();
    const grid = el("div", { className: "summary-grid" });

    let grandTotal = 0;

    data.phases.forEach(function (phase) {
      const days = groups[phase.id] || [];
      const phaseTotal = days.reduce(function (s, d) { return s + dayTotal(d); }, 0);
      grandTotal += phaseTotal;

      grid.appendChild(el("div", {
        className: "summary-phase-card",
        style: { background: phase.color },
      }, [
        el("span", { className: "summary-phase-name", text: phase.name }),
        el("span", { className: "summary-phase-amount", text: "¥" + fmtMoney(phaseTotal) }),
        el("span", { className: "summary-phase-days", text: phase.days }),
      ]));
    });

    container.appendChild(grid);

    // Grand total
    container.appendChild(el("div", { className: "grand-total" }, [
      el("span", { className: "grand-total-label", text: "全程总开销" }),
      el("span", { className: "grand-total-amount" }, [
        document.createTextNode("¥" + fmtMoney(grandTotal)),
        el("span", { className: "grand-total-unit", text: " 元" }),
      ]),
    ]));

    container.appendChild(el("div", {
      style: { marginTop: "16px", fontSize: "13px", color: "#999", textAlign: "center" },
      html: '开销数据保存在 <code>data/trip.json</code>，修改后自动保存。',
    }));
  }

  // ============ 开销编辑弹窗 ============

  let expenseModal = null;
  let modalOverlay = null;
  let currentEdit = null;

  function createExpenseModal() {
    modalOverlay = el("div", {
      className: "expense-modal-overlay",
      onClick: function (e) {
        if (e.target === modalOverlay) closeExpenseModal();
      },
    });

    expenseModal = el("div", { className: "expense-modal" }, [
      el("div", { className: "expense-modal-header" }, [
        el("h3", { text: "编辑开销" }),
        el("button", {
          className: "expense-modal-close",
          text: "×",
          onClick: closeExpenseModal,
        }),
      ]),
      el("div", { className: "expense-modal-body" }, [
        el("div", { className: "form-group" }, [
          el("label", { text: "项目" }),
          el("input", {
            type: "text",
            className: "form-input expense-item-input",
            placeholder: "例如：午餐-牛肉面",
          }),
        ]),
        el("div", { className: "form-group" }, [
          el("label", { text: "金额 (¥)" }),
          el("input", {
            type: "number",
            className: "form-input expense-amount-input",
            placeholder: "例如：35",
            min: "0",
          }),
        ]),
      ]),
      el("div", { className: "expense-modal-footer" }, [
        el("button", {
          className: "btn btn-secondary",
          text: "取消",
          onClick: closeExpenseModal,
        }),
        el("button", {
          className: "btn btn-primary",
          text: "保存",
          onClick: saveExpense,
        }),
      ]),
    ]);

    modalOverlay.appendChild(expenseModal);
    document.body.appendChild(modalOverlay);
  }

  function openExpenseModal(dayId, expenseIndex, expense) {
    if (!expenseModal) createExpenseModal();

    currentEdit = { dayId: dayId, index: expenseIndex };

    const title = expenseIndex < 0 ? "添加开销" : "编辑开销";
    expenseModal.querySelector(".expense-modal-header h3").textContent = title;

    const itemInput = expenseModal.querySelector(".expense-item-input");
    const amountInput = expenseModal.querySelector(".expense-amount-input");

    if (expense) {
      itemInput.value = expense.item;
      amountInput.value = expense.amount;
    } else {
      itemInput.value = "";
      amountInput.value = "";
    }

    itemInput.focus();
    modalOverlay.classList.add("show");
  }

  function closeExpenseModal() {
    if (modalOverlay) {
      modalOverlay.classList.remove("show");
    }
    currentEdit = null;
  }

  async function saveExpense() {
    if (!currentEdit) return;

    const itemInput = expenseModal.querySelector(".expense-item-input");
    const amountInput = expenseModal.querySelector(".expense-amount-input");

    const item = itemInput.value.trim();
    const amount = parseFloat(amountInput.value);

    if (!item) {
      alert("请输入项目名称");
      itemInput.focus();
      return;
    }

    if (isNaN(amount) || amount < 0) {
      alert("请输入有效的金额");
      amountInput.focus();
      return;
    }

    const expense = { item, amount };

    try {
      if (currentEdit.index < 0) {
        await store.addExpense(currentEdit.dayId, expense);
      } else {
        await store.updateExpense(currentEdit.dayId, currentEdit.index, expense);
      }
      closeExpenseModal();
      refreshUI();
    } catch (e) {
      alert("保存失败: " + e.message);
    }
  }

  async function deleteExpense(dayId, index, itemName) {
    if (!confirm('确定要删除 "' + itemName + '" 吗？')) return;

    try {
      await store.deleteExpense(dayId, index);
      refreshUI();
    } catch (e) {
      alert("删除失败: " + e.message);
    }
  }

  // ============ UI 刷新 ============

  function refreshUI() {
    const data = store.getData();
    if (!data) return;

    // 清除缓存，确保下次加载最新数据
    store.saveToCache(data);

    // 重新渲染
    renderHeader(data);
    renderTimeline(data);
    renderExpenseSummary(data);
  }

  // ============ 初始化 ============

  async function init() {
    const loadingEl = document.getElementById("loading");
    const contentEl = document.getElementById("main-content");
    const errorEl = document.getElementById("error-message");

    try {
      const data = await store.load();

      // 隐藏 loading，显示内容
      if (loadingEl) loadingEl.style.display = "none";
      if (contentEl) contentEl.style.display = "";

      renderHeader(data);
      renderTimeline(data);
      renderPhaseNav(data);
      renderExpenseSummary(data);

      // Footer
      document.getElementById("site-footer").innerHTML =
        "数据文件: data/trip.json · 修改后自动保存";

    } catch (e) {
      console.error("加载失败:", e);
      if (loadingEl) loadingEl.style.display = "none";
      if (errorEl) {
        errorEl.style.display = "";
        errorEl.querySelector("p").textContent = "数据加载失败: " + e.message;
      }
    }
  }

  // DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
