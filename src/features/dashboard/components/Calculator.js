"use client";

import { Fragment } from "react";
import { motion } from "framer-motion";
import { itemVariants } from "@/constants/animations";
import { useCalculator } from "../hooks/useCalculator";
import { CalcButton } from "./CalcButton";

const DIGIT_ROWS = [
  { digits: ["7", "8", "9"], operator: "*", label: "x" },
  { digits: ["4", "5", "6"], operator: "-", label: "-" },
  { digits: ["1", "2", "3"], operator: "+", label: "+" },
];

export function Calculator() {
  const calc = useCalculator();

  return (
    <motion.div variants={itemVariants} className="bg-white p-4 rounded-xl shadow-sm">
      <h2 className="text-xl font-semibold text-gray-800 mb-2">Calculator</h2>
      <div className="bg-gray-100 p-4 rounded-md text-right mb-4">
        <div className="text-gray-500 text-xl h-7 truncate">{calc.expression || "0"}</div>
        <div className="text-gray-800 text-4xl sm:text-5xl font-mono truncate">{calc.currentValue}</div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <CalcButton onClick={calc.clearAll}>AC</CalcButton>
        <CalcButton onClick={calc.deleteLast}>DEL</CalcButton>
        <CalcButton onClick={calc.percent}>%</CalcButton>
        <CalcButton onClick={() => calc.performOperation("/")}>/</CalcButton>
        {DIGIT_ROWS.map(({ digits, operator, label }) => (
          <Fragment key={operator}>
            {digits.map((digit) => (
              <CalcButton key={digit} onClick={() => calc.inputDigit(digit)}>
                {digit}
              </CalcButton>
            ))}
            <CalcButton onClick={() => calc.performOperation(operator)}>{label}</CalcButton>
          </Fragment>
        ))}
        <CalcButton className="col-span-2" onClick={() => calc.inputDigit("0")}>
          0
        </CalcButton>
        <CalcButton onClick={calc.inputDecimal}>.</CalcButton>
        <CalcButton tone="primary" onClick={calc.equals}>
          =
        </CalcButton>
      </div>
    </motion.div>
  );
}

export default Calculator;
