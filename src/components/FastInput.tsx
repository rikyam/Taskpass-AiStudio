import React, { useState, useEffect, useRef } from "react";

interface FastInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (val: string) => void;
  debounceMs?: number;
}

export const FastInput: React.FC<FastInputProps> = ({
  value,
  onChange,
  debounceMs = 300,
  ...props
}) => {
  const [localValue, setLocalValue] = useState(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const lastPropagatedValueRef = useRef(value);

  // Sync internal state when external value changes (e.g. state reset or voice typing)
  useEffect(() => {
    if (value !== lastPropagatedValueRef.current) {
      setLocalValue(value);
      lastPropagatedValueRef.current = value;
    }
  }, [value]);

  // Set up debounce to propagate to parent state
  useEffect(() => {
    if (localValue === value) return;

    const timer = setTimeout(() => {
      lastPropagatedValueRef.current = localValue;
      onChangeRef.current(localValue);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, value, debounceMs]);

  // Handle keydown for instant updates on 'Enter'
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      lastPropagatedValueRef.current = localValue;
      onChangeRef.current(localValue);
    }
    if (props.onKeyDown) {
      props.onKeyDown(e);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    lastPropagatedValueRef.current = localValue;
    onChangeRef.current(localValue);
    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  return (
    <input
      {...props}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    />
  );
};

interface FastTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  value: string;
  onChange: (val: string) => void;
  debounceMs?: number;
}

export const FastTextarea: React.FC<FastTextareaProps> = ({
  value,
  onChange,
  debounceMs = 300,
  ...props
}) => {
  const [localValue, setLocalValue] = useState(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const lastPropagatedValueRef = useRef(value);

  // Sync internal state when external value changes
  useEffect(() => {
    if (value !== lastPropagatedValueRef.current) {
      setLocalValue(value);
      lastPropagatedValueRef.current = value;
    }
  }, [value]);

  // Set up debounce to propagate to parent state
  useEffect(() => {
    if (localValue === value) return;

    const timer = setTimeout(() => {
      lastPropagatedValueRef.current = localValue;
      onChangeRef.current(localValue);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, value, debounceMs]);

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    lastPropagatedValueRef.current = localValue;
    onChangeRef.current(localValue);
    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  return (
    <textarea
      {...props}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
    />
  );
};
