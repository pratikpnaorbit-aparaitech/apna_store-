import { API } from "./api";

export const sendBillSMS = async (transactionId, mobile) => {
  return API.post("/sms/send-bill", {
    transactionId,
    mobile
  });
};
