import { connect, disconnect } from "mongoose";
const connnectToDatabase = async () => {
  try {
    const url = process.env.MONGODB_URL;
    if (!url) {
      throw new Error("MONGODB_URI is not defined");
    }
    await connect(url);
    console.log(" Connected To Mongodb");
  } catch (err) {
    console.log(err);
    throw new Error("Couldn't Connect To Mongodb");
  }
};
const disconnectFromDatabase = async () => {
  try {
    await disconnect();
  } catch (err) {
    console.log(err);
    throw new Error("Couldn't Disconnect From Mongodb");
  }
};
export { connnectToDatabase, disconnectFromDatabase };
