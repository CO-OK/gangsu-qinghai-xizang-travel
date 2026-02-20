/**
 * 状态管理层
 * 管理行程数据，支持本地缓存和乐观更新
 */

class TripStore {
  constructor() {
    this.data = null;
    this.cacheKey = "trip_data_cache";
  }

  /** 加载数据（API 优先，失败回退到缓存） */
  async load() {
    try {
      this.data = await API.getTripData();
      this.saveToCache(this.data);
      return this.data;
    } catch (e) {
      console.warn("API 加载失败，尝试使用缓存:", e);
      const cached = this.loadFromCache();
      if (cached) {
        this.data = cached;
        return cached;
      }
      throw e;
    }
  }

  /** 获取数据 */
  getData() {
    return this.data;
  }

  /** 获取指定天数的数据 */
  getDay(dayId) {
    return this.data?.days.find((d) => d.id === dayId);
  }

  /** 添加开销（乐观更新） */
  async addExpense(dayId, expense) {
    const day = this.getDay(dayId);
    if (!day) throw new Error("未找到对应的天数");

    // 乐观更新
    if (!day.expenses) day.expenses = [];
    day.expenses.push(expense);

    try {
      const result = await API.addExpense(dayId, expense);
      return result;
    } catch (e) {
      // 回滚
      day.expenses.pop();
      throw e;
    }
  }

  /** 修改开销（乐观更新） */
  async updateExpense(dayId, index, expense) {
    const day = this.getDay(dayId);
    if (!day) throw new Error("未找到对应的天数");
    if (!day.expenses || index >= day.expenses.length) {
      throw new Error("开销索引超出范围");
    }

    // 保存旧值用于回滚
    const oldExpense = { ...day.expenses[index] };

    // 乐观更新
    day.expenses[index] = expense;

    try {
      const result = await API.updateExpense(dayId, index, expense);
      return result;
    } catch (e) {
      // 回滚
      day.expenses[index] = oldExpense;
      throw e;
    }
  }

  /** 删除开销（乐观更新） */
  async deleteExpense(dayId, index) {
    const day = this.getDay(dayId);
    if (!day) throw new Error("未找到对应的天数");
    if (!day.expenses || index >= day.expenses.length) {
      throw new Error("开销索引超出范围");
    }

    // 保存旧值用于回滚
    const removed = day.expenses.splice(index, 1)[0];

    try {
      const result = await API.deleteExpense(dayId, index);
      return result;
    } catch (e) {
      // 回滚
      day.expenses.splice(index, 0, removed);
      throw e;
    }
  }

  /** 修改行程（乐观更新） */
  async updateDay(dayId, dayData) {
    const day = this.getDay(dayId);
    if (!day) throw new Error("未找到对应的天数");

    // 保存旧值用于回滚
    const oldDay = { ...day };

    // 乐观更新
    Object.keys(dayData).forEach((key) => {
      if (key !== "id" && key !== "expenses" && key !== "location") {
        day[key] = dayData[key];
      }
    });

    try {
      const result = await API.updateDay(dayId, dayData);
      return result;
    } catch (e) {
      // 回滚
      Object.assign(day, oldDay);
      throw e;
    }
  }

  /** 获取指定天数的地图标点 */
  async getLocation(dayId) {
    return API.getLocation(dayId);
  }

  /** 新增行程 */
  async addDay(insertAfter, dayData) {
    try {
      const result = await API.addDay(insertAfter, dayData);
      // 重新加载数据以获取更新后的完整数据
      await this.load();
      return result;
    } catch (e) {
      throw e;
    }
  }

  /** 删除行程 */
  async deleteDay(dayId) {
    try {
      const result = await API.deleteDay(dayId);
      // 重新加载数据以获取更新后的完整数据
      await this.load();
      return result;
    } catch (e) {
      throw e;
    }
  }

  /** 计算总开销 */
  getTotalExpense() {
    if (!this.data) return 0;
    return this.data.days.reduce((sum, day) => {
      return sum + (day.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
    }, 0);
  }

  /** 按阶段分组天数 */
  getDaysByPhase() {
    if (!this.data) return {};
    const groups = {};
    this.data.phases.forEach((p) => (groups[p.id] = []));
    this.data.days.forEach((d) => {
      if (groups[d.phase]) groups[d.phase].push(d);
    });
    return groups;
  }

  // ============ 缓存方法 ============

  saveToCache(data) {
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (e) {
      console.warn("缓存保存失败:", e);
    }
  }

  loadFromCache() {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // 缓存有效期 24 小时
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          return data;
        }
      }
    } catch (e) {
      console.warn("缓存读取失败:", e);
    }
    return null;
  }

  clearCache() {
    localStorage.removeItem(this.cacheKey);
  }
}

// 全局单例
const store = new TripStore();
