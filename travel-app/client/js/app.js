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

    // Add edit buttons container
    const editControls = el("div", { className: "phase-edit-controls" }, [
      el("button", {
        className: "btn-add-day",
        title: "新增行程",
        text: "+ 新增",
        onClick: openAddDayModal,
      }),
      el("button", {
        className: "btn-delete-day",
        title: "删除行程",
        text: "- 删除",
        onClick: deleteDayPrompt,
      }),
    ]);
    nav.appendChild(editControls);

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

    // Edit button
    const editBtn = el("button", {
      className: "btn-edit-day",
      title: "编辑行程",
      text: "编辑",
      onClick: function () { openDayModal(day); },
    });

    const info = el("div", { className: "day-info" }, [
      el("div", { className: "day-route", text: day.route }),
      meta,
    ]);

    card.appendChild(el("div", { className: "day-card-top" }, [tag, editBtn, info]));

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

  // ============ 行程编辑弹窗 ============

  let dayModal = null;
  let dayModalOverlay = null;
  let currentDayEdit = null;

  // 添加单个标点表单
  function addLocationField(data) {
    const container = dayModal.querySelector(".location-list");
    const index = container.children.length;

    // 为每个标点生成唯一 ID
    const locId = data && data.id ? data.id : 'loc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    const field = el("div", { className: "location-item" }, [
      el("input", {
        type: "hidden",
        className: "loc-id-input",
        value: locId,
      }),
      el("div", { className: "location-item-header" }, [
        el("span", { className: "location-item-title", text: "标点 " + (index + 1) }),
        el("div", { className: "location-item-actions" }, [
          el("button", {
            className: "btn-move-location btn-move-up",
            type: "button",
            title: "上移",
            text: "↑",
            onClick: function () {
              moveLocation(field, -1);
            },
          }),
          el("button", {
            className: "btn-move-location btn-move-down",
            type: "button",
            title: "下移",
            text: "↓",
            onClick: function () {
              moveLocation(field, 1);
            },
          }),
          el("button", {
            className: "btn-remove-location",
            type: "button",
            text: "删除",
            onClick: function () {
              container.removeChild(field);
              Array.from(container.children).forEach((item, i) => {
                item.querySelector(".location-item-title").textContent = "标点 " + (i + 1);
              });
            },
          }),
        ]),
      ]),
      el("div", { className: "location-fields" }, [
        el("div", { className: "form-row" }, [
          el("div", { className: "form-group form-group-name" }, [
            el("label", { text: "地点名称" }),
            el("input", {
              type: "text",
              className: "form-input loc-name-input",
              placeholder: "例如：张掖",
              value: data ? data.name : "",
            }),
          ]),
          // 隐藏的 order 字段，由程序自动维护
          el("input", {
            type: "hidden",
            className: "form-input loc-order-input",
            value: data && data.order !== undefined && data.order !== null ? data.order : "",
          }),
        ]),
        el("div", { className: "form-row" }, [
          el("div", { className: "form-group" }, [
            el("label", { text: "纬度" }),
            el("input", {
              type: "number",
              step: "0.0001",
              className: "form-input loc-lat-input",
              placeholder: "例如：38.926",
              value: data ? data.lat : "",
            }),
          ]),
          el("div", { className: "form-group" }, [
            el("label", { text: "经度" }),
            el("input", {
              type: "number",
              step: "0.0001",
              className: "form-input loc-lng-input",
              placeholder: "例如：100.45",
              value: data ? data.lng : "",
            }),
          ]),
        ]),
        el("div", { className: "form-group" }, [
          el("label", { text: "海拔" }),
          el("input", {
            type: "text",
            className: "form-input loc-alt-input",
            placeholder: "例如：1500m",
            value: data ? data.alt : "",
          }),
        ]),
        el("div", { className: "form-group" }, [
          el("label", { text: "描述" }),
          el("input", {
            type: "text",
            className: "form-input loc-desc-input",
            placeholder: "例如：大佛寺 + 七彩丹霞",
            value: data ? data.desc : "",
          }),
        ]),
        el("div", { className: "form-group form-checkbox" }, [
          el("label", { className: "checkbox-label" }, [
            el("input", {
              type: "checkbox",
              className: "loc-major-input",
              checked: data ? data.major : false,
            }),
            " 主要地点",
          ]),
        ]),
      ]),
    ]);

    container.appendChild(field);

    // 初始化/更新所有标点的 order 值
    initLocationOrders();
  }

  // 移动地点位置
  function moveLocation(field, direction) {
    const container = dayModal.querySelector(".location-list");
    const items = Array.from(container.children);
    const index = items.indexOf(field);

    if (direction === -1 && index === 0) return;
    if (direction === 1 && index === items.length - 1) return;

    const target = items[index + direction];
    if (direction === -1) {
      container.insertBefore(field, target);
    } else {
      container.insertBefore(target, field);
    }

    // 更新标题编号和 order 值
    Array.from(container.children).forEach((item, i) => {
      item.querySelector(".location-item-title").textContent = "标点 " + (i + 1);
      // 自动更新 order 值为 1, 2, 3...
      item.querySelector(".loc-order-input").value = i + 1;
    });
  }

  // 初始化所有标点的 order 值（如果尚未设置）
  function initLocationOrders() {
    const container = dayModal.querySelector(".location-list");
    if (!container) return;
    const items = Array.from(container.children);
    items.forEach((item, i) => {
      const orderInput = item.querySelector(".loc-order-input");
      if (!orderInput.value || orderInput.value === "") {
        orderInput.value = i + 1;
      }
    });
  }

  function createDayModal() {
    dayModalOverlay = el("div", {
      className: "day-modal-overlay",
      onClick: function (e) {
        if (e.target === dayModalOverlay) closeDayModal();
      },
    });

    dayModal = el("div", { className: "day-modal" }, [
      el("div", { className: "day-modal-header" }, [
        el("h3", { text: "编辑行程" }),
        el("button", {
          className: "day-modal-close",
          text: "×",
          onClick: closeDayModal,
        }),
      ]),
      el("div", { className: "day-modal-body" }, [
        el("div", { className: "form-group" }, [
          el("label", { text: "日期" }),
          el("input", {
            type: "text",
            className: "form-input day-date-input",
            placeholder: "例如：3/1",
          }),
        ]),
        el("div", { className: "form-group" }, [
          el("label", { text: "路线" }),
          el("input", {
            type: "text",
            className: "form-input day-route-input",
            placeholder: "例如：酒泉 → 张掖",
          }),
        ]),
        el("div", { className: "form-row" }, [
          el("div", { className: "form-group" }, [
            el("label", { text: "距离" }),
            el("input", {
              type: "text",
              className: "form-input day-distance-input",
              placeholder: "例如：220km",
            }),
          ]),
          el("div", { className: "form-group" }, [
            el("label", { text: "海拔" }),
            el("input", {
              type: "text",
              className: "form-input day-elevation-input",
              placeholder: "例如：1500m",
            }),
          ]),
        ]),
        el("div", { className: "form-group" }, [
          el("label", { text: "住宿" }),
          el("input", {
            type: "text",
            className: "form-input day-stay-input",
            placeholder: "例如：张掖市区",
          }),
        ]),
        el("div", { className: "form-group" }, [
          el("label", { text: "阶段" }),
          el("select", { className: "form-input day-phase-input" }, [
            el("option", { value: "1", text: "1 - 青甘东半环" }),
            el("option", { value: "2", text: "2 - G214+G318进藏" }),
            el("option", { value: "3", text: "3 - 林芝桃花" }),
            el("option", { value: "4", text: "4 - 拉萨" }),
            el("option", { value: "5", text: "5 - 阿里南线" }),
            el("option", { value: "6", text: "6 - 阿里北线+纳木错" }),
            el("option", { value: "7", text: "7 - 返程·青甘西半环" }),
          ]),
        ]),
        el("div", { className: "form-group" }, [
          el("label", { text: "景点（用逗号分隔）" }),
          el("input", {
            type: "text",
            className: "form-input day-spots-input",
            placeholder: "例如：张掖大佛寺, 七彩丹霞景区",
          }),
        ]),
        // 地图标点编辑区域（支持多个）
        el("div", { className: "location-section" }, [
          el("div", { className: "location-section-header" }, [
            el("span", { text: "🗺️ 地图标点" }),
            el("button", {
              className: "btn-add-location",
              type: "button",
              text: "+ 添加标点",
              onClick: function () {
                addLocationField();
              },
            }),
          ]),
          el("div", { className: "location-list" }),
        ]),
      ]),
      el("div", { className: "day-modal-footer" }, [
        el("button", {
          className: "btn btn-secondary",
          text: "取消",
          onClick: closeDayModal,
        }),
        el("button", {
          className: "btn btn-primary",
          text: "保存",
          onClick: saveDay,
        }),
      ]),
    ]);

    dayModalOverlay.appendChild(dayModal);
    document.body.appendChild(dayModalOverlay);
  }

  function openDayModal(day) {
    if (!dayModal) createDayModal();

    currentDayEdit = { day: day, isNew: false };

    // Clear location list
    const locationList = dayModal.querySelector(".location-list");
    locationList.innerHTML = "";

    dayModal.querySelector(".day-modal-header h3").textContent = "编辑行程 - " + day.id;

    dayModal.querySelector(".day-date-input").value = day.date || "";
    dayModal.querySelector(".day-route-input").value = day.route || "";
    dayModal.querySelector(".day-distance-input").value = day.distance || "";
    dayModal.querySelector(".day-elevation-input").value = day.elevation || "";
    dayModal.querySelector(".day-stay-input").value = day.stay || "";
    dayModal.querySelector(".day-phase-input").value = String(day.phase || 1);
    dayModal.querySelector(".day-spots-input").value = (day.spots || []).join(", ");

    // Load location data (multiple) - 按顺序排序
    const data = store.getData();
    if (data && data.locations) {
      const locs = data.locations.filter(l => l.day === day.id);
      // 按 order 字段排序（null 或 undefined 排在后面）
      locs.sort((a, b) => {
        const orderA = a.order !== undefined && a.order !== null ? a.order : Infinity;
        const orderB = b.order !== undefined && b.order !== null ? b.order : Infinity;
        return orderA - orderB;
      });
      if (locs.length > 0) {
        locs.forEach(loc => addLocationField(loc));
      }
    }

    // 确保所有标点的 order 值都已初始化
    initLocationOrders();

    dayModalOverlay.classList.add("show");
    dayModal.querySelector(".day-date-input").focus();
  }

  function closeDayModal() {
    if (dayModalOverlay) {
      dayModalOverlay.classList.remove("show");
    }
    currentDayEdit = null;
  }

  async function saveDay() {
    if (!currentDayEdit) return;

    if (currentDayEdit.isNew) {
      await saveNewDay();
      return;
    }

    const date = dayModal.querySelector(".day-date-input").value.trim();
    const route = dayModal.querySelector(".day-route-input").value.trim();
    const distance = dayModal.querySelector(".day-distance-input").value.trim();
    const elevation = dayModal.querySelector(".day-elevation-input").value.trim();
    const stay = dayModal.querySelector(".day-stay-input").value.trim();
    const phase = parseInt(dayModal.querySelector(".day-phase-input").value, 10);
    const spotsStr = dayModal.querySelector(".day-spots-input").value.trim();

    // Collect all location data
    const locationItems = dayModal.querySelectorAll(".location-item");
    const locations = [];
    locationItems.forEach(item => {
      const locId = item.querySelector(".loc-id-input").value;
      const name = item.querySelector(".loc-name-input").value.trim();
      const lat = item.querySelector(".loc-lat-input").value.trim();
      const lng = item.querySelector(".loc-lng-input").value.trim();
      const orderInput = item.querySelector(".loc-order-input").value.trim();

      if (name || lat || lng) {
        locations.push({
          id: locId,
          name: name,
          lat: parseFloat(lat) || 0,
          lng: parseFloat(lng) || 0,
          alt: item.querySelector(".loc-alt-input").value.trim(),
          desc: item.querySelector(".loc-desc-input").value.trim(),
          major: item.querySelector(".loc-major-input").checked,
          stay: stay,
          order: orderInput ? parseInt(orderInput, 10) : null,
        });
      }
    });

    const dayData = {
      date,
      route,
      distance,
      elevation,
      stay,
      phase,
      spots: spotsStr ? spotsStr.split(",").map((s) => s.trim()).filter((s) => s) : [],
      locations: locations,
    };

    try {
      await store.updateDay(currentDayEdit.day.id, dayData);
      closeDayModal();
      refreshUI();
      // 通知地图页面刷新
      localStorage.setItem('trip_data_updated', Date.now());
    } catch (e) {
      alert("保存失败: " + e.message);
    }
  }

  // ============ 新增/删除行程功能 ============

  function openAddDayModal() {
    const data = store.getData();
    if (!data) return;

    const days = data.days;
    const lastDay = days[days.length - 1];
    const lastNum = parseInt(lastDay.id.replace("D", ""));

    const options = [];
    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      options.push(day.id + " (" + (day.date || "") + ")");
    }

    const selection = prompt("请选择在哪天后新增行程（输入天数编号，如 D22）:\n\n可选: " + options.join(", "));

    if (!selection) return;

    const match = selection.match(/^D(\d+)$/i);
    if (!match) {
      alert("请输入正确的格式，如 D22");
      return;
    }

    const insertAfter = "D" + parseInt(match[1], 10);

    if (parseInt(match[1], 10) >= lastNum) {
      alert("插入位置不能是最后一天，请选择其他位置");
      return;
    }

    const newDayData = {
      date: "",
      route: "新行程路线",
      distance: "200km",
      elevation: "3000m",
      stay: "",
      phase: 1,
      spots: [],
    };

    if (!dayModal) createDayModal();

    currentDayEdit = { day: { id: "D_NEW", ...newDayData }, isNew: true, insertAfter: insertAfter };

    dayModal.querySelector(".day-modal-header h3").textContent = "新增行程 - " + insertAfter + " 后";

    dayModal.querySelector(".day-date-input").value = newDayData.date;
    dayModal.querySelector(".day-route-input").value = newDayData.route;
    dayModal.querySelector(".day-distance-input").value = newDayData.distance;
    dayModal.querySelector(".day-elevation-input").value = newDayData.elevation;
    dayModal.querySelector(".day-stay-input").value = newDayData.stay;
    dayModal.querySelector(".day-phase-input").value = String(newDayData.phase);
    dayModal.querySelector(".day-spots-input").value = "";

    // Clear location list for new day
    const locationList = dayModal.querySelector(".location-list");
    locationList.innerHTML = "";

    dayModalOverlay.classList.add("show");
    dayModal.querySelector(".day-date-input").focus();
  }

  async function saveNewDay() {
    if (!currentDayEdit || !currentDayEdit.isNew) return;

    const date = dayModal.querySelector(".day-date-input").value.trim();
    const route = dayModal.querySelector(".day-route-input").value.trim();
    const distance = dayModal.querySelector(".day-distance-input").value.trim();
    const elevation = dayModal.querySelector(".day-elevation-input").value.trim();
    const stay = dayModal.querySelector(".day-stay-input").value.trim();
    const phase = parseInt(dayModal.querySelector(".day-phase-input").value, 10);
    const spotsStr = dayModal.querySelector(".day-spots-input").value.trim();

    const dayData = {
      date: date,
      route: route,
      distance: distance,
      elevation: elevation,
      stay: stay,
      phase: phase,
      spots: spotsStr ? spotsStr.split(",").map((s) => s.trim()).filter((s) => s) : [],
    };

    try {
      await store.addDay(currentDayEdit.insertAfter, dayData);
      closeDayModal();
      refreshUI();
      localStorage.setItem('trip_data_updated', Date.now());
    } catch (e) {
      alert("新增失败: " + e.message);
    }
  }

  async function deleteDayPrompt() {
    const data = store.getData();
    if (!data) return;

    const days = data.days;
    const selection = prompt("请输入要删除的天数编号（如 D28）:\n\n当前行程: " + days.map((d) => d.id).join(", "));

    if (!selection) return;

    const match = selection.match(/^D(\d+)$/i);
    if (!match) {
      alert("请输入正确的格式，如 D28");
      return;
    }

    const dayId = "D" + parseInt(match[1], 10);

    const day = days.find((d) => d.id === dayId);
    if (!day) {
      alert("未找到 " + dayId);
      return;
    }

    if (!confirm("确定要删除 " + dayId + " 吗？\n\n此操作不可恢复，后续行程天数将自动调整。")) {
      return;
    }

    try {
      await store.deleteDay(dayId);
      refreshUI();
      localStorage.setItem('trip_data_updated', Date.now());
    } catch (e) {
      alert("删除失败: " + e.message);
    }
  }

  // ============ UI 刷新 ============

  async function refreshUI() {
    // 重新从服务器加载最新数据
    try {
      const data = await store.load();
      // 重新渲染
      renderHeader(data);
      renderTimeline(data);
      renderExpenseSummary(data);
      // 通知其他标签页
      localStorage.setItem('trip_data_updated', Date.now());
    } catch (e) {
      console.error('刷新数据失败:', e);
      // 如果加载失败，使用本地缓存
      const data = store.getData();
      if (data) {
        renderHeader(data);
        renderTimeline(data);
        renderExpenseSummary(data);
      }
    }
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
