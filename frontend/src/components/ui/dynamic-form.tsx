'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

interface DynamicFormField {
  name: string;
  title: string;
  description: string;
  type: 'string' | 'boolean' | 'bool' | 'integer' | 'number';
  default?: any;
  required?: boolean;
  enum?: any[];
  format?: 'password' | 'url' | 'email' | 'textarea';
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  ui?: {
    widget?: 'text' | 'textarea' | 'select' | 'checkbox' | 'password' | 'url' | 'number';
    help?: string;
  };
}

interface DynamicFormProps {
  schema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  uiSchema?: Record<string, any>;
  initialValues?: Record<string, any>;
  onSubmit: (values: Record<string, any>) => void;
  title?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function DynamicForm({
  schema,
  uiSchema = {},
  initialValues = {},
  onSubmit
}: DynamicFormProps) {
  const { t } = useLanguage();
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [validationResult, setValidationResult] = useState<ValidationResult>({ valid: true, errors: {} });

  // 从Schema生成字段定义
  const generateFields = (): DynamicFormField[] => {
    if (!schema.properties) return [];

    return Object.entries(schema.properties).map(([name, fieldSchema]: [string, any]) => {
      const required = schema.required?.includes(name) || false;
      const uiFieldConfig = uiSchema[name] || {};

      console.log(`Generating field: ${name}, schema type: ${fieldSchema.type}`);

      return {
        name,
        title: fieldSchema.title || name,
        description: fieldSchema.description || '',
        type: fieldSchema.type,
        default: fieldSchema.default,
        required,
        enum: fieldSchema.enum,
        format: fieldSchema.format,
        minimum: fieldSchema.minimum,
        maximum: fieldSchema.maximum,
        minLength: fieldSchema.minLength,
        maxLength: fieldSchema.maxLength,
        pattern: fieldSchema.pattern,
        ui: {
          widget: uiFieldConfig['ui:widget'],
          help: uiFieldConfig['ui:help']
        }
      };
    });
  };

  const fields = generateFields();

  // 使用useMemo计算合并后的值，避免在effect中调用setState
  const mergedValues = useMemo(() => {
    const defaultValues: Record<string, any> = {};
    fields.forEach(field => {
      if (field.default !== undefined) {
        defaultValues[field.name] = field.default;
      } else if (field.type === 'boolean') {
        defaultValues[field.name] = false;
      } else {
        defaultValues[field.name] = '';
      }
    });
    return { ...defaultValues, ...initialValues };
  }, [fields, initialValues]);

  // 当合并后的值变化时更新状态
  useEffect(() => {
    setValues(mergedValues);
  }, [mergedValues]);

  // 验证单个字段
  const validateField = (field: DynamicFormField, value: any): string => {
    // 必填验证
    if (field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return `${field.title} ${t('validation.isRequired')}`;
    }

    // 类型验证
    if (value !== null && value !== undefined && value !== '') {
      switch (field.type) {
        case 'integer':
          const intValue = parseInt(value);
          if (isNaN(intValue)) {
            return `${field.title} ${t('validation.mustBeInteger')}`;
          }
          if (field.minimum !== undefined && intValue < field.minimum) {
            return `${field.title} ${t('validation.mustBeAtLeast', { value: field.minimum })}`;
          }
          if (field.maximum !== undefined && intValue > field.maximum) {
            return `${field.title} ${t('validation.mustBeAtMost', { value: field.maximum })}`;
          }
          break;

        case 'number':
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            return `${field.title} ${t('validation.mustBeNumber')}`;
          }
          if (field.minimum !== undefined && numValue < field.minimum) {
            return `${field.title} ${t('validation.mustBeAtLeast', { value: field.minimum })}`;
          }
          if (field.maximum !== undefined && numValue > field.maximum) {
            return `${field.title} ${t('validation.mustBeAtMost', { value: field.maximum })}`;
          }
          break;

        case 'string':
          const strValue = String(value);
          if (field.minLength !== undefined && strValue.length < field.minLength) {
            return `${field.title} ${t('validation.mustBeAtLeastChars', { value: field.minLength })}`;
          }
          if (field.maxLength !== undefined && strValue.length > field.maxLength) {
            return `${field.title} ${t('validation.mustBeAtMostChars', { value: field.maxLength })}`;
          }
          // 简单的URL验证
          if (field.format === 'url' && !isValidUrl(strValue)) {
            return `${field.title} ${t('validation.mustBeValidUrl')}`;
          }
          break;
      }

      // 枚举验证
      if (field.enum && !field.enum.includes(value)) {
        return `${field.title} ${t('validation.mustBeOneOf', { value: field.enum.join(', ') })}`;
      }
    }

    return '';
  };

  // 验证所有字段
  const validateForm = (): ValidationResult => {
    const newErrors: Record<string, string> = {};
    let valid = true;

    fields.forEach(field => {
      const error = validateField(field, values[field.name]);
      if (error) {
        newErrors[field.name] = error;
        valid = false;
      }
    });

    return { valid, errors: newErrors };
  };

  // 字段值变更处理
  const handleFieldChange = (fieldName: string, value: any) => {
    const newValues = { ...values, [fieldName]: value };
    setValues(newValues);

    // 实时验证
    const field = fields.find(f => f.name === fieldName);
    if (field) {
      const error = validateField(field, value);
      setErrors(prev => ({
        ...prev,
        [fieldName]: error
      }));
    }
  };

  // 表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateForm();
    setValidationResult(validation);

    if (validation.valid) {
      onSubmit(values);
    }
  };

  // 简单的URL验证
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  if (fields.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.noConfigurationRequired')}</CardTitle>
          <CardDescription>
            {t('settings.noConfigurableParameters')}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full">
        <div className="space-y-4 w-full">
          {fields.map((field) => (
            <div key={field.name} className="space-y-2 w-full">
              <div className="flex items-center gap-2">
                <Label htmlFor={field.name} className="text-sm font-medium">
                  {field.title}
                </Label>
                {field.required && <Badge variant="destructive" className="text-xs px-1 py-0">{t('common.required')}</Badge>}
              </div>
              <div className="w-full">
                {(() => {
                  const value = field.name in values ? values[field.name] : '';
                  const error = errors[field.name];
                  const isPasswordVisible = field.name in showPasswords ? showPasswords[field.name] : false;

                  // 确定widget类型
                  let widgetType = field.ui?.widget;
                  if (!widgetType) {
                    switch (field.type) {
                      case 'boolean':
                      case 'bool':
                        widgetType = 'checkbox';
                        break;
                      case 'integer':
                      case 'number':
                        widgetType = 'number';
                        break;
                      case 'string':
                        if (field.enum) {
                          widgetType = 'select';
                        } else if (field.format === 'password') {
                          widgetType = 'password';
                        } else if (field.format === 'url') {
                          widgetType = 'url';
                        } else if (field.maxLength && field.maxLength > 100) {
                          widgetType = 'textarea';
                        } else {
                          widgetType = 'text';
                        }
                        break;
                      default:
                        widgetType = 'text';
                    }
                  }

                  console.log(`Field ${field.name}: type=${field.type}, widgetType=${widgetType}`);

                  return (
                    <>
                      {widgetType === 'text' && (
                        <Input
                          id={field.name}
                          type={field.format === 'url' ? 'url' : 'text'}
                          value={value || ''}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          className={`w-full ${error ? 'border-destructive' : ''}`}
                        />
                      )}

                      {widgetType === 'password' && (
                        <div className="relative">
                          <Input
                            id={field.name}
                            type={isPasswordVisible ? 'text' : 'password'}
                            value={value || ''}
                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                            className={`w-full ${error ? 'border-destructive' : ''}`}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2"
                            onClick={() => setShowPasswords(prev => ({ ...prev, [field.name]: !prev[field.name] }))}
                          >
                            {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      )}

                      {widgetType === 'url' && (
                        <Input
                          id={field.name}
                          type="url"
                          value={value || ''}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          placeholder="https://example.com"
                          className={`w-full ${error ? 'border-destructive' : ''}`}
                        />
                      )}

                      {widgetType === 'textarea' && (
                        <Textarea
                          id={field.name}
                          value={value || ''}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          rows={2}
                          className={`w-full resize-none ${error ? 'border-destructive' : ''}`}
                        />
                      )}

                      {widgetType === 'number' && (
                        <Input
                          id={field.name}
                          type="number"
                          value={value || ''}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          min={field.minimum}
                          max={field.maximum}
                          className={`w-full ${error ? 'border-destructive' : ''}`}
                        />
                      )}

                      {widgetType === 'select' && (
                        <Select value={value?.toString() || ''} onValueChange={(v) => handleFieldChange(field.name, v)}>
                          <SelectTrigger className={`w-full ${error ? 'border-destructive' : ''}`}>
                            <SelectValue placeholder={t('validation.selectField', { field: field.title })} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.enum?.map((option, optionIndex) => (
                              <SelectItem key={optionIndex} value={option.toString()}>
                                {option.toString()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {widgetType === 'checkbox' && (
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={field.name}
                            checked={Boolean(value)}
                            onCheckedChange={(checked) => handleFieldChange(field.name, checked)}
                          />
                        </div>
                      )}

                      {error && (
                        <p className="text-xs text-destructive mt-1">
                          {error}
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>

  
        {/* 验证错误摘要 */}
        {!validationResult.valid && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('validation.fixFollowingErrors')}:
              <ul className="mt-2 list-disc list-inside">
                {Object.entries(validationResult.errors).map(([field, error]) => (
                  <li key={field}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </form>
  );
}