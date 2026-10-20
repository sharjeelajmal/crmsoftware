"use client";

import { useState } from "react";

const calculate = (a, b, op) => {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return b === 0 ? "Error" : a / b;
    default:
      return b;
  }
};

/** State + key handlers for the dashboard's simple four-function calculator. */
export function useCalculator() {
  const [currentValue, setCurrentValue] = useState("0");
  const [expression, setExpression] = useState("");
  const [operator, setOperator] = useState(null);
  const [prevValue, setPrevValue] = useState(null);

  const inputDigit = (digit) => setCurrentValue(currentValue === "0" ? String(digit) : currentValue + digit);

  const inputDecimal = () => {
    if (!currentValue.includes(".")) setCurrentValue(`${currentValue}.`);
  };

  const deleteLast = () => setCurrentValue(currentValue.length > 1 ? currentValue.slice(0, -1) : "0");

  const percent = () => setCurrentValue(String(parseFloat(currentValue) / 100));

  const clearAll = () => {
    setCurrentValue("0");
    setExpression("");
    setPrevValue(null);
    setOperator(null);
  };

  const performOperation = (nextOp) => {
    setExpression(`${expression}${currentValue} ${nextOp} `);
    if (prevValue !== null && operator) {
      setPrevValue(calculate(prevValue, parseFloat(currentValue), operator));
    } else {
      setPrevValue(parseFloat(currentValue));
    }
    setCurrentValue("0");
    setOperator(nextOp);
  };

  const equals = () => {
    if (!operator || prevValue === null) return;
    const result = calculate(prevValue, parseFloat(currentValue), operator);
    setExpression(String(result));
    setCurrentValue(String(result));
    setPrevValue(null);
    setOperator(null);
  };

  return {
    currentValue,
    expression,
    inputDigit,
    inputDecimal,
    deleteLast,
    percent,
    clearAll,
    performOperation,
    equals,
  };
}
