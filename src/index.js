import app from "./app.js";
import { connnectToDatabase } from "./config/db.js";
const PORT = process.env.PORT || 5000;
connnectToDatabase()
    .then(() => {
    app.listen(PORT, () => {
        console.log("Server is running");
    });
})
    .catch((err) => {
    console.log(err);
});
