export interface Technician {
  id: number;
  name: string;
  user_id: number | null;
  active: boolean;
}

export interface FleetVehicle {
  id: number;
  plate: string;
  model: string;
  description: string;
  active: boolean;
}

export interface ExpenseAuthorization {
  id: string;
  code: string;
  requester_name: string;
  requester_phone: string | null;
  requester_email: string | null;
  reason: string;
  amount: number;
  manager_name: string;
  status: 'Pendente' | 'Aprovada' | 'Reprovada';
  decision_at: string | null;
  created_at: string;
}

export interface FieldExpense {
  id: number;
  receipt_image_path: string | null;
  receipt_image_url: string | null;
  ai_raw_response: Record<string, unknown> | null;
  ai_confidence: Record<string, string> | null;
  technician_name: string;
  client_name: string | null;
  client_name_normalized: string | null;
  location: string | null;
  location_normalized: string | null;
  category: string;
  expense_date: string | null;
  vehicle_id: number | null;
  vehicle_km: number | null;
  fuel_liters: number | null;
  fuel_type: string | null;
  service_type: string | null;
  service_type_custom: string | null;
  auth_code: string | null;
  item_description: string | null;
  amount: number;
  payment_method: string | null;
  osv_number: string | null;
  nf_number: string | null;
  status: 'pendente' | 'validado' | 'rejeitado';
  validated_by: string | null;
  validated_at: string | null;
  notes: string | null;
  submitted_at: string;
  updated_at: string;
}

export type ConfidenceLevel = 'alta' | 'media' | 'baixa';

export interface AIExtractionResult {
  estabelecimento: string | null;
  valor_total: number | null;
  data: string | null;
  hora: string | null;
  categoria_sugerida: string | null;
  forma_pagamento: string | null;
  numero_nf: string | null;
  cidade: string | null;
  estado: string | null;
  combustivel_litros: number | null;
  combustivel_tipo: string | null;
  confiancas: Record<string, ConfidenceLevel>;
}

export interface ExpenseFormData {
  technician_name: string;
  client_name: string;
  amount: string;
  category: string;
  expense_date: string;
  location: string;
  nf_number: string;
  payment_method: string;
  service_type: string;
  service_type_custom: string;
  osv_number: string;
  vehicle_id: string;
  vehicle_km: string;
  fuel_liters: string;
  fuel_type: string;
  auth_code: string;
  item_description: string;
  notes: string;
}
