'use client';

import React, { useState, useEffect } from 'react';
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
import { PluginParameter } from '@/lib/plugin-schema-service';

interface PluginParametersFormProps {
  parameters: PluginParameter[];  // 插件参数数组
  initialValues?: Record<string, any>;  // 初始值
  onSubmit: (values: Record<string, any>) => void;  // 提交回调
}

interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function PluginParametersForm({
  parameters,
  initialValues = {},
  onSubmit
}: PluginParametersFormProps) {
  const { t } = useLanguage();
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [validationResult, setValidationResult] = useState<ValidationResult>({ valid: true, errors: {} });

  // 设置默认值
  useEffect(() => {
    const defaultValues: Record<string, any> = {};
    parameters.forEach((param, index) => {
      const paramName = `param${index}`;
      if (param.default_value !== undefined) {
        defaultValues[paramName] = param.default_value;
      } else if (param.type === 'bool') {
        defaultValues[paramName] = false;
      } else {
        defaultValues[paramName] = '';
      }
    });

    // 合并初始值和默认值
    setValues({ ...defaultValues, ...initialValues });
  }, [parameters, initialValues]);

  // 验证单个字段
  const validateField = (param: PluginParameter, value: any, paramName: string): string => {
    // 类型验证
    if (value !== null && value !== undefined && value !== '') {
      switch (param.type) {
        case 'int':
          const intValue = parseInt(value);
          if (isNaN(intValue)) {
            return `${param.desc} ${t('validation.mustBeInteger')}`;
          }
          break;

        case 'string':
          const strValue = String(value);
          if (strValue.length === 0 && param.default_value === undefined) {
            return `${param.desc} ${t('validation.isRequired')}`;
          }
          break;

        case 'bool':
          // bool类型总是有效（true/false）
          break;
      }
    }

    return '';
  };

  // 验证所有字段
  const validateForm = (): ValidationResult => {
    const newErrors: Record<string, string> = {};
    let valid = true;

    parameters.forEach((param, index) => {
      const paramName = `param${index}`;
      const value = values[paramName];
      const error = validateField(param, value, paramName);
      if (error) {
        newErrors[paramName] = error;
        valid = false;
      }
    });

    return { valid, errors: newErrors };
  };

  // 字段值变更处理
  const handleFieldChange = (paramName: string, value: any) => {
    const newValues = { ...values, [paramName]: value };
    setValues(newValues);

    // 实时验证
    const paramIndex = parseInt(paramName.replace('param', ''));
    if (!isNaN(paramIndex) && paramIndex < parameters.length) {
      const param = parameters[paramIndex];
      const error = validateField(param, value, paramName);
      setErrors(prev => ({
        ...prev,
        [paramName]: error
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

  if (parameters.length === 0) {
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
        {parameters.map((param, index) => {
          const paramName = `param${index}`;
          const value = values[paramName];
          const error = errors[paramName];
          const isPasswordVisible = showPasswords[paramName];

          // 根据参数类型确定表单控件
          return (
            <div key={paramName} className="space-y-2 w-full">
              <div className="flex items-center gap-2">
                <Label htmlFor={paramName} className="text-sm font-medium">
                  {param.desc}
                </Label>
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  {param.type}
                </Badge>
              </div>
              <div className="w-full">
                {(() => {
                  switch (param.type) {
                    case 'string':
                      // 如果字符串很长，使用textarea
                      if (param.desc.includes('description') || param.desc.includes('comment')) {
                        return (
                          <Textarea
                            id={paramName}
                            value={value || ''}
                            onChange={(e) => handleFieldChange(paramName, e.target.value)}
                            rows={2}
                            className={`w-full resize-none ${error ? 'border-destructive' : ''}`}
                            placeholder={param.default_value || ''}
                          />
                        );
                      } else {
                        return (
                          <Input
                            id={paramName}
                            type="text"
                            value={value || ''}
                            onChange={(e) => handleFieldChange(paramName, e.target.value)}
                            className={`w-full ${error ? 'border-destructive' : ''}`}
                            placeholder={param.default_value || ''}
                          />
                        );
                      }

                    case 'int':
                      return (
                        <Input
                          id={paramName}
                          type="number"
                          value={value || ''}
                          onChange={(e) => handleFieldChange(paramName, e.target.value)}
                          className={`w-full ${error ? 'border-destructive' : ''}`}
                          placeholder={param.default_value || ''}
                        />
                      );

                    case 'bool':
                      return (
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={paramName}
                            checked={Boolean(value)}
                            onCheckedChange={(checked) => handleFieldChange(paramName, checked)}
                          />
                          <span className="text-sm text-muted-foreground">
                            {value ? t('settings.enabled') : t('settings.disabled')}
                          </span>
                        </div>
                      );

                    default:
                      return (
                        <Input
                          id={paramName}
                          type="text"
                          value={value || ''}
                          onChange={(e) => handleFieldChange(paramName, e.target.value)}
                          className={`w-full ${error ? 'border-destructive' : ''}`}
                          placeholder={param.default_value || ''}
                        />
                      );
                  }
                })()}

                {error && (
                  <p className="text-xs text-destructive mt-1">
                    {error}
                  </p>
                )}
              </div>
            </div>
          );
        })}
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