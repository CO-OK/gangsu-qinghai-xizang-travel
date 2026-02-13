/**
 * API 封装层
 * 负责与后端 RESTful API 通信
 */

const API = {
  BASE_URL: "/api",

  /** 获取完整行程数据 */
  async getTripData() {
    const res = await fetch(`${this.BASE_URL}/trip-data`);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  },

  /** 添加开销 */
  async addExpense(dayId, expense) {
    const res = await fetch(`${this.BASE_URL}/expenses/${dayId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(expense),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "添加失败");
    }
    return res.json();
  },

  /** 修改开销 */
  async updateExpense(dayId, index, expense) {
    const res = await fetch(`${this.BASE_URL}/expenses/${dayId}/${index}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(expense),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "修改失败");
    }
    return res.json();
  },

  /** 删除开销 */
  async deleteExpense(dayId, index) {
    const res = await fetch(`${this.BASE_URL}/expenses/${dayId}/${index}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "删除失败");
    }
    return res.json();
  },
};
