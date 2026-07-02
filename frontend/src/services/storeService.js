import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api", // your backend
});

// format rupees
export const formatINR = (amount) => {
  return "₹" + Number(amount).toFixed(2);
};

export const storeService = {

  // 🔹 Load products from backend inventory
  async getProducts() {
    const res = await API.get("/inventory");
    return res.data;
  },

  // 🔹 Add new transaction (bill)
  async addTransaction(data) {
    const res = await API.post("/billing", data);
    return res.data;
  },

  // 🔹 Reduce stock after billing
  async updateStock(productId, qty) {
    return API.put(`/inventory/${productId}/reduce`, { qty });
  },

  // 🔹 Customer APIs
  async getCustomerByPhone(phone) {
    const res = await API.get(`/customers/${phone}`);
    return res.data;
  },

  async addCustomer(customer) {
    const res = await API.post("/customers", customer);
    return res.data;
  },

  // 🔹 Send SMS (optional)
  async sendBillSMS(bill, phone) {
    const res = await API.post("/sms/send", { bill, phone });
    return res.data;
  }
};
