import React, { useState, useEffect, useRef, startTransition } from "react";

interface FastInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (val: string) => void;
  debounceMs?: number;
}

export const FastInput: React.FC<FastInputProps> = ({
  value,
  onChange,
  debounceMs = 0,
  ...props
}) => {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const isTypingRef = useRef(false);
  const debounceTimerRef = useRef<any>(null);

  // Sync internal state when external value changes
  useEffect(() => {
    if (value !== localValue && !isTypingRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    isTypingRef.current = true;
    setLocalValue(newVal);

    if (debounceMs > 0) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        startTransition(() => {
          onChangeRef.current(newVal);
        });
      }, debounceMs);
    } else {
      startTransition(() => {
        onChangeRef.current(newVal);
      });
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    isTypingRef.current = false;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    onChangeRef.current(localValue);
    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  return (
    <input
      {...props}
      ref={inputRef}
      value={localValue}
      onChange={handleChange}
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
  debounceMs = 0,
  ...props
}) => {
  const [localValue, setLocalValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const isTypingRef = useRef(false);
  const debounceTimerRef = useRef<any>(null);

  // Sync internal state when external value changes
  useEffect(() => {
    if (value !== localValue && !isTypingRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    isTypingRef.current = true;
    setLocalValue(newVal);

    if (debounceMs > 0) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        startTransition(() => {
          onChangeRef.current(newVal);
        });
      }, debounceMs);
    } else {
      startTransition(() => {
        onChangeRef.current(newVal);
      });
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    isTypingRef.current = false;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    onChangeRef.current(localValue);
    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  return (
    <textarea
      {...props}
      ref={textareaRef}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
};

