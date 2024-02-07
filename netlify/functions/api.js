import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import serverless from "serverless-http";

const api = express();

api.use(cors());
api.use(bodyParser.json());

mongoose.connect(process.env.DATABASE_URL);

const budgetSchema = new mongoose.Schema({
  name: String,
  max: Number,
});

const expenseSchema = new mongoose.Schema({
  description: String,
  amount: Number,
  budgetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Budget",
  },
});

const Budget = mongoose.model("Budget", budgetSchema);
const Expense = mongoose.model("Expense", expenseSchema);

const router = Router();

router.get("/", (req, res) => {
  res.json({
    message: "Budget back end running",
  });
});

router.get("/budgets", async (req, res) => {
  try {
    const allBudgets = await Budget.find({});
    res.json(allBudgets);
  } catch (e) {
    console.error(e);
  }
});

router.post("/budgets/new", (req, res) => {
  const budget = req.body;
  const newBudget = new Budget({ name: budget.name, max: budget.max });
  newBudget
    .save()
    .then(() => {
      console.log("Budget saved");
      res.sendStatus(200);
    })
    .catch((e) => console.error(e));
});

router.delete("/budgets/:id", async (req, res) => {
  const budgetId = req.params.id;
  const uncategorised = await Budget.findOne({ name: "Uncategorised" });
  let uncategorisedId = uncategorised._id;
  if (!uncategorised) {
    const createUncategorised = new Budget({ name: "Uncategorised", max: 0 });
    await createUncategorised.save();
    uncategorisedId = createUncategorised._id;
  }
  await Expense.updateMany(
    { budgetId: budgetId },
    { budgetId: uncategorisedId }
  );
  await Budget.findByIdAndDelete(budgetId);
  console.log("Budget deleted");
  res.sendStatus(200);
});

router.get("/expenses", async (req, res) => {
  try {
    const allExpenses = await Expense.find({}).populate("budgetId");
    res.json(allExpenses);
  } catch (e) {
    console.error(e);
  }
});

router.post("/expenses/new", async (req, res) => {
  const expense = req.body;
  if (expense.budgetId !== "Uncategorised") {
    const newExpense = new Expense({
      description: expense.description,
      amount: expense.amount,
      budgetId: expense.budgetId,
    });
    await newExpense.save();
    console.log("Expense Saved");
    res.sendStatus(200);
  } else {
    const uncategorised = await Budget.findOne({ name: "Uncategorised" });
    if (!uncategorised) {
      const createUncategorised = new Budget({ name: "Uncategorised", max: 0 });
      await createUncategorised.save();
      const newExpense = new Expense({
        description: expense.description,
        amount: expense.amount,
        budgetId: createUncategorised._id,
      });
      await newExpense.save();
      console.log("Expense Saved");
      res.sendStatus(200);
    } else {
      const newExpense = new Expense({
        description: expense.description,
        amount: expense.amount,
        budgetId: uncategorised._id,
      });
      await newExpense.save();
      console.log("Expense Saved");
      res.sendStatus(200);
    }
  }
});

router.delete("/expenses/:id", async (req, res) => {
  const expenseId = req.params.id;
  await Expense.findByIdAndDelete(expenseId);
  console.log("Expense deleted");
  res.sendStatus(200);
});

api.use("/api/", router);

export const handler = serverless(api);
