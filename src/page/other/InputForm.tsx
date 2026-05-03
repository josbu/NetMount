import { CSSProperties, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Form, FormInstance } from '@arco-design/web-react'
import { StorageParamItemType } from '../../type/controller/storage/info'
import { ParametersType } from '../../type/defaults'
import { getProperties } from '../../utils'
import { InputFormItemContent_module, filter } from './InputFormItemContent'

const FormItem = Form.Item

function paramsType2FormItems(
  params: ParametersType,
  isAdvanced: boolean = false,
  filter: string[] = []
) {
  //丢弃key匹配filter的项
  const formItems: StorageParamItemType[] = []

  getProperties(params).forEach(item => {
    if (filter.includes(item.key)) return

    const valueType:
      | 'string'
      | 'number'
      | 'bigint'
      | 'boolean'
      | 'symbol'
      | 'undefined'
      | 'object'
      | 'function'
      | 'array' = typeof item.value
    const formItem: StorageParamItemType = {
      label: item.key,
      name: item.key,
      description: item.key,
      type: 'boolean',
      required: false,
      default: item.value,
      advanced: isAdvanced,
      isPassword: false,
    }
    switch (valueType) {
      case 'boolean':
        formItem.type = 'boolean'
        break
      case 'number':
        formItem.type = 'number'
        break
      case 'object':
        if ((item.value as { select?: string[] })?.select) {
          //选择器
          formItem.type = 'string'
          formItem.default = (item.value as { default?: unknown })?.default
          formItem.select = (item.value as { select: string[] }).select.map(
            (selectItem: string) => {
              return {
                label: selectItem,
                value: selectItem,
                help: selectItem,
              }
            }
          )
        } else {
          formItem.type = 'string'
        }
        break
      default:
        formItem.type = 'string'
        break
    }
    formItems.push(formItem)
  })

  return formItems
}

function InputForm_module({
  data,
  style,
  showAdvanced,
  footer,
  onChange,
  overwriteValues,
  setFormHook,
  header,
  isEditMode,
  framework,
}: {
  data: StorageParamItemType[]
  footer?: JSX.Element
  header?: JSX.Element
  showAdvanced?: boolean
  style?: CSSProperties
  onChange?: (data: ParametersType) => void
  overwriteValues?: ParametersType
  setFormHook?: (form: FormInstance) => void
  isEditMode?: boolean
  framework?: 'rclone' | 'openlist'
}) {
  const { t } = useTranslation()
  const [form] = Form.useForm()

  const [formValuesResult, setFormValuesResult] = useState<ParametersType>({})

  if (showAdvanced === undefined) showAdvanced = false
  useEffect(() => {
    setFormHook && setFormHook(form)
    if (overwriteValues) form.setFieldsValue(overwriteValues)
  }, [])

  useEffect(() => {
    onChange && onChange(formValuesResult)
  }, [formValuesResult])

  return (
    <Form
      form={form}
      onValuesChange={() => {
        setFormValuesResult(form.getFieldsValue(form.getTouchedFields()))
      }}
    >
      {header && header}
      {(() => {
        const formItems: JSX.Element[] = []

        for (const dataItem of data) {
          //过滤
          const filterState =
            dataItem.filters && formValuesResult
              ? filter(dataItem.filters, formValuesResult)
              : undefined

          formItems.push(
            <FormItem
              key={dataItem.name}
              requiredSymbol={false}
              label={
                <div className="singe-line" title={t(dataItem.label)}>
                  {dataItem.required && '*'}
                  {t(dataItem.label)}
                </div>
              }
              title={dataItem.description}
              field={dataItem.name}
              triggerPropName={dataItem.type === 'boolean' ? 'checked' : 'value'}
              initialValue={dataItem.default}
              rules={[{ required: dataItem.required }]}
              hidden={
                dataItem.hide !== undefined
                  ? dataItem.hide
                  : filterState !== undefined
                    ? !filterState
                    : dataItem.advanced && !showAdvanced
              }
              style={{ ...style }}
            >
              {InputFormItemContent_module({ data: dataItem, formValuesResult: formValuesResult, isEditMode: isEditMode, framework: framework })}
            </FormItem>
          )
        }

        return formItems.filter(item => item && item)
      })()}
      {footer && footer}
    </Form>
  )
}

export { InputForm_module, paramsType2FormItems, InputFormItemContent_module }
