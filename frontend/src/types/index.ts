/** Global TypeScript interfaces matching the FastAPI response schemas. */

export interface Settings {
  settings_id: number
  featherless_key: string
  aws_access_key: string
  aws_secret_access_key: string
  theme: string
  has_featherless_key: boolean
  has_aws_keys: boolean
}

export interface Model {
  model_id: number
  name: string
  source: string
  metadata_json: string
}

export interface Dataset {
  dataset_id: number
  name: string
  imgs_route: string
  csv_route: string
  image_column: string
}

export interface CsvPreview {
  headers: string[]
  rows: Record<string, unknown>[]
  total_rows: number
  total_columns: number
  path?: string
}

export interface ColumnMapping {
  column_id: number
  name: string
  dataset_id: number
  dimension_id: number
}

export interface Domain {
  domain_id: number
  name: string
}

export interface Dimension {
  dimension_id: number
  name: string
}

export interface Prompt {
  prompt_id: number
  domain_id: number
  dimension_ids: number[]
  text: string
  expected_result: string
  bias_type: string
  is_active: boolean
}

export interface Evaluation {
  evaluation_id: number
  model_id: number
  dataset_id: number
  domain_id: number
  num_images: number
  images_resolution: string
  status: string
  progress: number
}

export interface Inference {
  inference_id: number
  image_id: number
  prompt_id: number
  evaluation_id: number
  response: string
  audit_status: string
  prompt_text: string
  thumbnail_url: string
  img_route: string
}

export interface Metric {
  metric_id: number
  evaluation_id: number
  name: string
  value_json: string
  chart_type: string
}
