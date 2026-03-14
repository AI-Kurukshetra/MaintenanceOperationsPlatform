
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "admin" | "manager" | "technician" | "viewer";
export type AssetCategory =
  | "machinery"
  | "electrical"
  | "hvac"
  | "plumbing"
  | "vehicle"
  | "safety"
  | "other";
export type AssetStatus =
  | "operational"
  | "needs_repair"
  | "under_maintenance"
  | "decommissioned";
export type CriticalityLevel = "critical" | "high" | "medium" | "low";
export type WorkOrderType =
  | "reactive"
  | "preventive"
  | "predictive"
  | "inspection"
  | "emergency";
export type WorkOrderStatus =
  | "open"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "cancelled";
export type WorkOrderPriority = "critical" | "high" | "medium" | "low";
export type PMType = "time_based" | "usage_based" | "condition_based";
export type FrequencyUnit =
  | "days"
  | "weeks"
  | "months"
  | "years"
  | "hours"
  | "cycles";
export type EntityType = "asset" | "work_order" | "maintenance_plan" | "location";
export type NotificationType = "work_order" | "maintenance" | "inventory" | "system";
export type VendorCategory =
  | "parts_supplier"
  | "service_provider"
  | "equipment_manufacturer"
  | "contractor"
  | "other";
export type ActivityType =
  | "status_change"
  | "comment"
  | "parts_update"
  | "attachment"
  | "assignment_change";
export type InventoryTxType = "add" | "remove" | "set";
export type BudgetCategory = "labor" | "parts" | "contractor" | "total";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: UserRole;
          department: string | null;
          phone: string | null;
          avatar_url: string | null;
          hourly_rate: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          role?: UserRole;
          department?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          hourly_rate?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          role?: UserRole;
          department?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          hourly_rate?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      locations: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          city: string | null;
          state: string | null;
          country: string | null;
          parent_location_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string | null;
          parent_location_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string | null;
          parent_location_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vendors: {
        Row: {
          id: string;
          name: string;
          contact_name: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          country: string | null;
          category: VendorCategory | null;
          rating: number | null;
          is_active: boolean;
          notes: string | null;
          website: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact_name?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string | null;
          category?: VendorCategory | null;
          rating?: number | null;
          is_active?: boolean;
          notes?: string | null;
          website?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          contact_name?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string | null;
          category?: VendorCategory | null;
          rating?: number | null;
          is_active?: boolean;
          notes?: string | null;
          website?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      assets: {
        Row: {
          id: string;
          name: string;
          asset_code: string;
          description: string | null;
          category: AssetCategory;
          status: AssetStatus;
          criticality: CriticalityLevel;
          location_id: string | null;
          parent_asset_id: string | null;
          manufacturer: string | null;
          model: string | null;
          serial_number: string | null;
          purchase_date: string | null;
          purchase_cost: number | null;
          warranty_expiry: string | null;
          expected_lifespan_years: number | null;
          qr_code: string | null;
          image_url: string | null;
          custom_fields: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          asset_code?: string | null;
          description?: string | null;
          category: AssetCategory;
          status?: AssetStatus;
          criticality?: CriticalityLevel;
          location_id?: string | null;
          parent_asset_id?: string | null;
          manufacturer?: string | null;
          model?: string | null;
          serial_number?: string | null;
          purchase_date?: string | null;
          purchase_cost?: number | null;
          warranty_expiry?: string | null;
          expected_lifespan_years?: number | null;
          qr_code?: string | null;
          image_url?: string | null;
          custom_fields?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          asset_code?: string | null;
          description?: string | null;
          category?: AssetCategory;
          status?: AssetStatus;
          criticality?: CriticalityLevel;
          location_id?: string | null;
          parent_asset_id?: string | null;
          manufacturer?: string | null;
          model?: string | null;
          serial_number?: string | null;
          purchase_date?: string | null;
          purchase_cost?: number | null;
          warranty_expiry?: string | null;
          expected_lifespan_years?: number | null;
          qr_code?: string | null;
          image_url?: string | null;
          custom_fields?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      work_orders: {
        Row: {
          id: string;
          wo_number: string;
          title: string;
          description: string | null;
          type: WorkOrderType;
          status: WorkOrderStatus;
          priority: WorkOrderPriority;
          asset_id: string | null;
          location_id: string | null;
          assigned_to: string | null;
          requested_by: string | null;
          due_date: string | null;
          started_at: string | null;
          completed_at: string | null;
          estimated_hours: number | null;
          actual_hours: number | null;
          labor_cost: number;
          parts_cost: number;
          total_cost: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          wo_number?: string | null;
          title: string;
          description?: string | null;
          type: WorkOrderType;
          status?: WorkOrderStatus;
          priority?: WorkOrderPriority;
          asset_id?: string | null;
          location_id?: string | null;
          assigned_to?: string | null;
          requested_by?: string | null;
          due_date?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          estimated_hours?: number | null;
          actual_hours?: number | null;
          labor_cost?: number;
          parts_cost?: number;
          total_cost?: never;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          wo_number?: string | null;
          title?: string;
          description?: string | null;
          type?: WorkOrderType;
          status?: WorkOrderStatus;
          priority?: WorkOrderPriority;
          asset_id?: string | null;
          location_id?: string | null;
          assigned_to?: string | null;
          requested_by?: string | null;
          due_date?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          estimated_hours?: number | null;
          actual_hours?: number | null;
          labor_cost?: number;
          parts_cost?: number;
          total_cost?: never;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      maintenance_plans: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          asset_id: string | null;
          type: PMType;
          frequency_value: number | null;
          frequency_unit: FrequencyUnit | null;
          next_due_date: string | null;
          last_performed_at: string | null;
          is_active: boolean;
          assigned_to: string | null;
          checklist: Json;
          wo_title_template: string | null;
          wo_description_template: string | null;
          wo_priority: WorkOrderPriority;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          asset_id?: string | null;
          type: PMType;
          frequency_value?: number | null;
          frequency_unit?: FrequencyUnit | null;
          next_due_date?: string | null;
          last_performed_at?: string | null;
          is_active?: boolean;
          assigned_to?: string | null;
          checklist?: Json;
          wo_title_template?: string | null;
          wo_description_template?: string | null;
          wo_priority?: WorkOrderPriority;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          asset_id?: string | null;
          type?: PMType;
          frequency_value?: number | null;
          frequency_unit?: FrequencyUnit | null;
          next_due_date?: string | null;
          last_performed_at?: string | null;
          is_active?: boolean;
          assigned_to?: string | null;
          checklist?: Json;
          wo_title_template?: string | null;
          wo_description_template?: string | null;
          wo_priority?: WorkOrderPriority;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      parts: {
        Row: {
          id: string;
          name: string;
          part_number: string | null;
          description: string | null;
          category: string | null;
          unit_cost: number;
          quantity_on_hand: number;
          minimum_quantity: number;
          location_id: string | null;
          vendor_id: string | null;
          supplier: string | null;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          part_number?: string | null;
          description?: string | null;
          category?: string | null;
          unit_cost?: number;
          quantity_on_hand?: number;
          minimum_quantity?: number;
          location_id?: string | null;
          vendor_id?: string | null;
          supplier?: string | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          part_number?: string | null;
          description?: string | null;
          category?: string | null;
          unit_cost?: number;
          quantity_on_hand?: number;
          minimum_quantity?: number;
          location_id?: string | null;
          vendor_id?: string | null;
          supplier?: string | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      work_order_parts: {
        Row: {
          id: string;
          work_order_id: string;
          part_id: string | null;
          quantity_used: number;
          unit_cost: number | null;
          total_cost: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          work_order_id: string;
          part_id?: string | null;
          quantity_used: number;
          unit_cost?: number | null;
          total_cost?: never;
          created_at?: string;
        };
        Update: {
          id?: string;
          work_order_id?: string;
          part_id?: string | null;
          quantity_used?: number;
          unit_cost?: number | null;
          total_cost?: never;
          created_at?: string;
        };
        Relationships: [];
      };
      maintenance_history: {
        Row: {
          id: string;
          asset_id: string | null;
          work_order_id: string | null;
          action: string;
          performed_by: string | null;
          performed_at: string;
          notes: string | null;
          downtime_minutes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          asset_id?: string | null;
          work_order_id?: string | null;
          action: string;
          performed_by?: string | null;
          performed_at?: string;
          notes?: string | null;
          downtime_minutes?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          asset_id?: string | null;
          work_order_id?: string | null;
          action?: string;
          performed_by?: string | null;
          performed_at?: string;
          notes?: string | null;
          downtime_minutes?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          name: string;
          file_url: string;
          file_type: string | null;
          file_size: number | null;
          entity_type: EntityType;
          entity_id: string;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          file_url: string;
          file_type?: string | null;
          file_size?: number | null;
          entity_type: EntityType;
          entity_id: string;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          file_url?: string;
          file_type?: string | null;
          file_size?: number | null;
          entity_type?: EntityType;
          entity_id?: string;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string | null;
          type: NotificationType | null;
          is_read: boolean;
          link: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message?: string | null;
          type?: NotificationType | null;
          is_read?: boolean;
          link?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string | null;
          type?: NotificationType | null;
          is_read?: boolean;
          link?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      work_order_activities: {
        Row: {
          id: string;
          work_order_id: string;
          user_id: string | null;
          type: ActivityType;
          content: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          work_order_id: string;
          user_id?: string | null;
          type: ActivityType;
          content?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          work_order_id?: string;
          user_id?: string | null;
          type?: ActivityType;
          content?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      inventory_transactions: {
        Row: {
          id: string;
          part_id: string | null;
          type: InventoryTxType;
          quantity_change: number;
          quantity_before: number;
          quantity_after: number;
          reason: string | null;
          notes: string | null;
          work_order_id: string | null;
          performed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          part_id?: string | null;
          type: InventoryTxType;
          quantity_change: number;
          quantity_before: number;
          quantity_after: number;
          reason?: string | null;
          notes?: string | null;
          work_order_id?: string | null;
          performed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          part_id?: string | null;
          type?: InventoryTxType;
          quantity_change?: number;
          quantity_before?: number;
          quantity_after?: number;
          reason?: string | null;
          notes?: string | null;
          work_order_id?: string | null;
          performed_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      vendor_contracts: {
        Row: {
          id: string;
          vendor_id: string;
          title: string;
          description: string | null;
          start_date: string | null;
          end_date: string | null;
          value: number | null;
          document_url: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          title: string;
          description?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          value?: number | null;
          document_url?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          title?: string;
          description?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          value?: number | null;
          document_url?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      budgets: {
        Row: {
          id: string;
          name: string;
          location_id: string | null;
          year: number;
          month: number | null;
          amount: number;
          spent: number;
          category: BudgetCategory | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          location_id?: string | null;
          year: number;
          month?: number | null;
          amount: number;
          spent?: number;
          category?: BudgetCategory | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          location_id?: string | null;
          year?: number;
          month?: number | null;
          amount?: number;
          spent?: number;
          category?: BudgetCategory | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          id: string;
          user_id: string;
          email_enabled: boolean;
          wo_assigned: boolean;
          wo_completed: boolean;
          pm_due: boolean;
          low_stock: boolean;
          wo_overdue: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email_enabled?: boolean;
          wo_assigned?: boolean;
          wo_completed?: boolean;
          pm_due?: boolean;
          low_stock?: boolean;
          wo_overdue?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email_enabled?: boolean;
          wo_assigned?: boolean;
          wo_completed?: boolean;
          pm_due?: boolean;
          low_stock?: boolean;
          wo_overdue?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      company_settings: {
        Row: {
          id: string;
          company_name: string;
          default_currency: string;
          default_timezone: string;
          date_format: string;
          wo_prefix: string;
          asset_prefix: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_name?: string;
          default_currency?: string;
          default_timezone?: string;
          date_format?: string;
          wo_prefix?: string;
          asset_prefix?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_name?: string;
          default_currency?: string;
          default_timezone?: string;
          date_format?: string;
          wo_prefix?: string;
          asset_prefix?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_user_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
    };
    Enums: {
      user_role: UserRole;
      asset_category: AssetCategory;
      asset_status: AssetStatus;
      criticality_level: CriticalityLevel;
      wo_type: WorkOrderType;
      wo_status: WorkOrderStatus;
      wo_priority: WorkOrderPriority;
      pm_type: PMType;
      frequency_unit: FrequencyUnit;
      entity_type: EntityType;
      notification_type: NotificationType;
      vendor_category: VendorCategory;
      activity_type: ActivityType;
      inventory_tx_type: InventoryTxType;
      budget_category: BudgetCategory;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Location = Database["public"]["Tables"]["locations"]["Row"];
export type Vendor = Database["public"]["Tables"]["vendors"]["Row"];
export type Asset = Database["public"]["Tables"]["assets"]["Row"];
export type WorkOrder = Database["public"]["Tables"]["work_orders"]["Row"];
export type MaintenancePlan = Database["public"]["Tables"]["maintenance_plans"]["Row"];
export type Part = Database["public"]["Tables"]["parts"]["Row"];
export type WorkOrderPart = Database["public"]["Tables"]["work_order_parts"]["Row"];
export type MaintenanceHistory = Database["public"]["Tables"]["maintenance_history"]["Row"];
export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type WorkOrderActivity = Database["public"]["Tables"]["work_order_activities"]["Row"];
export type InventoryTransaction = Database["public"]["Tables"]["inventory_transactions"]["Row"];
export type VendorContract = Database["public"]["Tables"]["vendor_contracts"]["Row"];
export type Budget = Database["public"]["Tables"]["budgets"]["Row"];
export type NotificationPreferences = Database["public"]["Tables"]["notification_preferences"]["Row"];
export type CompanySettings = Database["public"]["Tables"]["company_settings"]["Row"];

export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
export type AssetInsert = Database["public"]["Tables"]["assets"]["Insert"];
export type AssetUpdate = Database["public"]["Tables"]["assets"]["Update"];
export type WorkOrderInsert = Database["public"]["Tables"]["work_orders"]["Insert"];
export type WorkOrderUpdate = Database["public"]["Tables"]["work_orders"]["Update"];
export type MaintenancePlanInsert = Database["public"]["Tables"]["maintenance_plans"]["Insert"];
export type MaintenancePlanUpdate = Database["public"]["Tables"]["maintenance_plans"]["Update"];
export type PartInsert = Database["public"]["Tables"]["parts"]["Insert"];
export type PartUpdate = Database["public"]["Tables"]["parts"]["Update"];
export type LocationInsert = Database["public"]["Tables"]["locations"]["Insert"];
export type LocationUpdate = Database["public"]["Tables"]["locations"]["Update"];
export type VendorInsert = Database["public"]["Tables"]["vendors"]["Insert"];
export type VendorUpdate = Database["public"]["Tables"]["vendors"]["Update"];
export type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];
export type NotificationUpdate = Database["public"]["Tables"]["notifications"]["Update"];
export type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"];
export type DocumentUpdate = Database["public"]["Tables"]["documents"]["Update"];
export type MaintenanceHistoryInsert = Database["public"]["Tables"]["maintenance_history"]["Insert"];
export type MaintenanceHistoryUpdate = Database["public"]["Tables"]["maintenance_history"]["Update"];
export type WorkOrderPartInsert = Database["public"]["Tables"]["work_order_parts"]["Insert"];
export type WorkOrderPartUpdate = Database["public"]["Tables"]["work_order_parts"]["Update"];
export type WorkOrderActivityInsert = Database["public"]["Tables"]["work_order_activities"]["Insert"];
export type WorkOrderActivityUpdate = Database["public"]["Tables"]["work_order_activities"]["Update"];
export type InventoryTransactionInsert = Database["public"]["Tables"]["inventory_transactions"]["Insert"];
export type InventoryTransactionUpdate = Database["public"]["Tables"]["inventory_transactions"]["Update"];
export type VendorContractInsert = Database["public"]["Tables"]["vendor_contracts"]["Insert"];
export type VendorContractUpdate = Database["public"]["Tables"]["vendor_contracts"]["Update"];
export type BudgetInsert = Database["public"]["Tables"]["budgets"]["Insert"];
export type BudgetUpdate = Database["public"]["Tables"]["budgets"]["Update"];
export type CompanySettingsInsert = Database["public"]["Tables"]["company_settings"]["Insert"];
export type CompanySettingsUpdate = Database["public"]["Tables"]["company_settings"]["Update"];
export type NotificationPreferencesInsert = Database["public"]["Tables"]["notification_preferences"]["Insert"];
export type NotificationPreferencesUpdate = Database["public"]["Tables"]["notification_preferences"]["Update"];

