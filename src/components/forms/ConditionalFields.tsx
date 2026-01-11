import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export type Condition<T> = 
  | { type: "equals"; field: keyof T; value: unknown }
  | { type: "notEquals"; field: keyof T; value: unknown }
  | { type: "contains"; field: keyof T; value: string }
  | { type: "greaterThan"; field: keyof T; value: number }
  | { type: "lessThan"; field: keyof T; value: number }
  | { type: "isEmpty"; field: keyof T }
  | { type: "isNotEmpty"; field: keyof T }
  | { type: "in"; field: keyof T; values: unknown[] }
  | { type: "custom"; fn: (values: T) => boolean };

export type LogicalOperator = "and" | "or";

export interface ConditionalFieldsProps<T extends Record<string, unknown>> {
  children: React.ReactNode;
  values: T;
  conditions: Condition<T> | Condition<T>[];
  operator?: LogicalOperator;
  animate?: boolean;
  fallback?: React.ReactNode;
  className?: string;
}

export interface ConditionalGroupProps<T extends Record<string, unknown>> {
  children: React.ReactNode;
  values: T;
  rules: Array<{
    conditions: Condition<T> | Condition<T>[];
    operator?: LogicalOperator;
    content: React.ReactNode;
  }>;
  defaultContent?: React.ReactNode;
  animate?: boolean;
  className?: string;
}

// ============================================================================
// CONDITION EVALUATOR
// ============================================================================

function evaluateCondition<T extends Record<string, unknown>>(
  condition: Condition<T>,
  values: T
): boolean {
  switch (condition.type) {
    case "equals":
      return values[condition.field] === condition.value;
    
    case "notEquals":
      return values[condition.field] !== condition.value;
    
    case "contains":
      const strValue = String(values[condition.field] || "");
      return strValue.toLowerCase().includes(condition.value.toLowerCase());
    
    case "greaterThan":
      return Number(values[condition.field]) > condition.value;
    
    case "lessThan":
      return Number(values[condition.field]) < condition.value;
    
    case "isEmpty":
      const isEmpty = values[condition.field];
      return isEmpty === null || isEmpty === undefined || isEmpty === "" || 
             (Array.isArray(isEmpty) && isEmpty.length === 0);
    
    case "isNotEmpty":
      const isNotEmpty = values[condition.field];
      return isNotEmpty !== null && isNotEmpty !== undefined && isNotEmpty !== "" && 
             !(Array.isArray(isNotEmpty) && isNotEmpty.length === 0);
    
    case "in":
      return condition.values.includes(values[condition.field]);
    
    case "custom":
      return condition.fn(values);
    
    default:
      return false;
  }
}

function evaluateConditions<T extends Record<string, unknown>>(
  conditions: Condition<T> | Condition<T>[],
  values: T,
  operator: LogicalOperator = "and"
): boolean {
  const conditionArray = Array.isArray(conditions) ? conditions : [conditions];
  
  if (operator === "and") {
    return conditionArray.every(c => evaluateCondition(c, values));
  } else {
    return conditionArray.some(c => evaluateCondition(c, values));
  }
}

// ============================================================================
// CONDITIONAL FIELDS COMPONENT
// ============================================================================

export function ConditionalFields<T extends Record<string, unknown>>({
  children,
  values,
  conditions,
  operator = "and",
  animate = true,
  fallback,
  className,
}: ConditionalFieldsProps<T>) {
  const shouldShow = evaluateConditions(conditions, values, operator);

  if (!animate) {
    return shouldShow ? <div className={className}>{children}</div> : (fallback || null);
  }

  return (
    <AnimatePresence mode="wait">
      {shouldShow ? (
        <motion.div
          key="content"
          initial={{ opacity: 0, height: 0, marginTop: 0 }}
          animate={{ opacity: 1, height: "auto", marginTop: 16 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className={cn("overflow-hidden", className)}
        >
          {children}
        </motion.div>
      ) : fallback ? (
        <motion.div
          key="fallback"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={className}
        >
          {fallback}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// ============================================================================
// CONDITIONAL GROUP COMPONENT
// ============================================================================

export function ConditionalGroup<T extends Record<string, unknown>>({
  values,
  rules,
  defaultContent,
  animate = true,
  className,
}: ConditionalGroupProps<T>) {
  const matchingRule = rules.find(rule => 
    evaluateConditions(rule.conditions, values, rule.operator)
  );

  const content = matchingRule?.content || defaultContent;

  if (!animate) {
    return <div className={className}>{content}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={matchingRule ? rules.indexOf(matchingRule) : "default"}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className={className}
      >
        {content}
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// HOOK: useConditionalField
// ============================================================================

export interface UseConditionalFieldOptions<T extends Record<string, unknown>> {
  values: T;
  conditions: Condition<T> | Condition<T>[];
  operator?: LogicalOperator;
}

export function useConditionalField<T extends Record<string, unknown>>({
  values,
  conditions,
  operator = "and",
}: UseConditionalFieldOptions<T>) {
  const shouldShow = React.useMemo(
    () => evaluateConditions(conditions, values, operator),
    [conditions, values, operator]
  );

  return { shouldShow };
}

// ============================================================================
// DEPENDENT FIELD COMPONENT
// ============================================================================

export interface DependentFieldProps<T extends Record<string, unknown>> {
  children: React.ReactNode;
  values: T;
  dependsOn: keyof T;
  showWhen?: unknown | unknown[];
  hideWhen?: unknown | unknown[];
  animate?: boolean;
  className?: string;
}

export function DependentField<T extends Record<string, unknown>>({
  children,
  values,
  dependsOn,
  showWhen,
  hideWhen,
  animate = true,
  className,
}: DependentFieldProps<T>) {
  const fieldValue = values[dependsOn];
  
  let shouldShow = true;

  if (showWhen !== undefined) {
    const showValues = Array.isArray(showWhen) ? showWhen : [showWhen];
    shouldShow = showValues.includes(fieldValue);
  }

  if (hideWhen !== undefined) {
    const hideValues = Array.isArray(hideWhen) ? hideWhen : [hideWhen];
    shouldShow = !hideValues.includes(fieldValue);
  }

  if (!animate) {
    return shouldShow ? <div className={className}>{children}</div> : null;
  }

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className={cn("overflow-hidden", className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// FIELD DEPENDENCY HELPER
// ============================================================================

export function when<T extends Record<string, unknown>>(
  field: keyof T,
  value: unknown
): Condition<T> {
  return { type: "equals", field, value };
}

export function whenNot<T extends Record<string, unknown>>(
  field: keyof T,
  value: unknown
): Condition<T> {
  return { type: "notEquals", field, value };
}

export function whenIn<T extends Record<string, unknown>>(
  field: keyof T,
  values: unknown[]
): Condition<T> {
  return { type: "in", field, values };
}

export function whenEmpty<T extends Record<string, unknown>>(
  field: keyof T
): Condition<T> {
  return { type: "isEmpty", field };
}

export function whenNotEmpty<T extends Record<string, unknown>>(
  field: keyof T
): Condition<T> {
  return { type: "isNotEmpty", field };
}

export function whenGreaterThan<T extends Record<string, unknown>>(
  field: keyof T,
  value: number
): Condition<T> {
  return { type: "greaterThan", field, value };
}

export function whenLessThan<T extends Record<string, unknown>>(
  field: keyof T,
  value: number
): Condition<T> {
  return { type: "lessThan", field, value };
}

export function whenCustom<T extends Record<string, unknown>>(
  fn: (values: T) => boolean
): Condition<T> {
  return { type: "custom", fn };
}
