# Formula IHU Hub - Architecture & Scaling Guide

## Current Architecture Analysis

### Strengths
- **Modern Stack**: Next.js 14 with App Router provides excellent performance and developer experience
- **Type Safety**: Full TypeScript implementation ensures code reliability
- **Database Design**: Well-structured PostgreSQL schema with proper relationships
- **Security**: Row Level Security (RLS) policies provide data isolation
- **UI/UX**: shadcn/ui components provide consistent, accessible interface

### Critical Issues Identified
1. **Schema Mismatch**: Code references `inspection_progress` but schema defines `checklist_checks`
2. **Intermittent Status Updates**: Race conditions in status transition logic
3. **Missing Real-time Features**: No live updates for multi-user scenarios
4. **Limited Conflict Resolution**: No handling for concurrent edits
5. **Performance Bottlenecks**: Missing critical database indexes

## Production-Ready Scaling Solutions

### 1. Real-Time Subscriptions Architecture

#### WebSocket Implementation with Supabase Realtime
```typescript
// src/hooks/useRealtimeSubscription.ts
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeSubscriptionProps {
  table: string
  filter?: Record<string, any>
  onUpdate: (payload: any) => void
}

export function useRealtimeSubscription({ 
  table, 
  filter, 
  onUpdate 
}: UseRealtimeSubscriptionProps) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const newChannel = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: filter ? Object.entries(filter).map(([key, value]) => `${key}=eq.${value}`).join('&') : undefined
        },
        onUpdate
      )
      .subscribe()

    setChannel(newChannel)

    return () => {
      newChannel.unsubscribe()
    }
  }, [table, filter, onUpdate, supabase])

  return channel
}
```

#### Multi-User Conflict Resolution
```typescript
// src/hooks/useConflictResolution.ts
import { useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface ConflictResolutionProps {
  bookingId: string
  onConflict: (conflict: ConflictData) => void
}

interface ConflictData {
  itemId: string
  currentValue: any
  incomingValue: any
  lastModifiedBy: string
  lastModifiedAt: string
}

export function useConflictResolution({ bookingId, onConflict }: ConflictResolutionProps) {
  const [conflicts, setConflicts] = useState<ConflictData[]>([])
  const supabase = createClientComponentClient()

  const resolveConflict = useCallback(async (
    itemId: string, 
    resolution: 'keep_current' | 'accept_incoming' | 'merge'
  ) => {
    // Implement conflict resolution logic
    const conflict = conflicts.find(c => c.itemId === itemId)
    if (!conflict) return

    let resolvedValue
    switch (resolution) {
      case 'keep_current':
        resolvedValue = conflict.currentValue
        break
      case 'accept_incoming':
        resolvedValue = conflict.incomingValue
        break
      case 'merge':
        // Implement merge logic based on data type
        resolvedValue = mergeValues(conflict.currentValue, conflict.incomingValue)
        break
    }

    // Update database with resolved value
    await supabase
      .from('inspection_progress')
      .update({ 
        status: resolvedValue.status,
        comment: resolvedValue.comment,
        resolved_at: new Date().toISOString()
      })
      .eq('booking_id', bookingId)
      .eq('item_id', itemId)

    // Remove from conflicts
    setConflicts(prev => prev.filter(c => c.itemId !== itemId))
  }, [conflicts, bookingId, supabase])

  return { conflicts, resolveConflict }
}
```

### 2. Performance Optimization

#### Database Query Optimization
```sql
-- Critical indexes for performance
CREATE INDEX CONCURRENTLY idx_bookings_team_date_status_priority 
ON bookings(team_id, date, status, priority_level DESC, start_time);

CREATE INDEX CONCURRENTLY idx_inspection_progress_booking_item_status 
ON inspection_progress(booking_id, item_id, status) 
WHERE status IS NOT NULL;

CREATE INDEX CONCURRENTLY idx_checklist_templates_inspection_section_order 
ON checklist_templates(inspection_type_id, section, order_index);

-- Partial indexes for common queries
CREATE INDEX CONCURRENTLY idx_bookings_today_ongoing 
ON bookings(date, start_time) 
WHERE date = CURRENT_DATE AND status = 'ongoing';

CREATE INDEX CONCURRENTLY idx_inspection_progress_recent_updates 
ON inspection_progress(updated_at DESC) 
WHERE updated_at > NOW() - INTERVAL '1 hour';
```

#### Caching Strategy
```typescript
// src/lib/cache.ts
import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL!)

export class CacheManager {
  // Cache frequently accessed data
  static async getChecklistTemplates(inspectionTypeId: string) {
    const cacheKey = `checklist_templates:${inspectionTypeId}`
    const cached = await redis.get(cacheKey)
    
    if (cached) {
      return JSON.parse(cached)
    }
    
    // Fetch from database and cache
    const data = await fetchChecklistTemplates(inspectionTypeId)
    await redis.setex(cacheKey, 3600, JSON.stringify(data)) // 1 hour TTL
    return data
  }

  // Invalidate cache on updates
  static async invalidateChecklistTemplates(inspectionTypeId: string) {
    await redis.del(`checklist_templates:${inspectionTypeId}`)
  }
}
```

### 3. File Upload Integration

#### Secure File Upload System
```typescript
// src/lib/fileUpload.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export class FileUploadManager {
  private supabase = createClientComponentClient()

  async uploadChecklistAttachment(
    bookingId: string,
    itemId: string,
    file: File,
    metadata: Record<string, any> = {}
  ) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${bookingId}/${itemId}/${Date.now()}.${fileExt}`
    
    const { data, error } = await this.supabase.storage
      .from('checklist-attachments')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        metadata: {
          bookingId,
          itemId,
          uploadedBy: (await this.supabase.auth.getUser()).data.user?.id,
          ...metadata
        }
      })

    if (error) throw error

    // Store file reference in database
    await this.supabase
      .from('checklist_attachments')
      .insert({
        booking_id: bookingId,
        item_id: itemId,
        file_path: data.path,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        metadata
      })

    return data
  }

  async getChecklistAttachments(bookingId: string, itemId?: string) {
    const query = this.supabase
      .from('checklist_attachments')
      .select('*')
      .eq('booking_id', bookingId)
    
    if (itemId) {
      query.eq('item_id', itemId)
    }

    return query
  }
}
```

### 4. Advanced Audit Trail System

#### Comprehensive Audit Logging
```sql
-- Enhanced audit trail table
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values jsonb,
  new_values jsonb,
  changed_by uuid REFERENCES auth.users(id) NOT NULL,
  changed_at timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text,
  session_id text
);

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (table_name, record_id, action, new_values, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_values, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_bookings_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_inspection_progress_trigger
  AFTER INSERT OR UPDATE OR DELETE ON inspection_progress
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

### 5. Multi-Scrutineer Workflow

#### Scrutineer Assignment System
```typescript
// src/hooks/useScrutineerAssignment.ts
export function useScrutineerAssignment(bookingId: string) {
  const [assignedScrutineers, setAssignedScrutineers] = useState<string[]>([])
  const [availableScrutineers, setAvailableScrutineers] = useState<User[]>([])
  
  const assignScrutineer = async (scrutineerId: string) => {
    // Assign scrutineer to booking
    await supabase
      .from('booking_scrutineers')
      .insert({
        booking_id: bookingId,
        scrutineer_id: scrutineerId,
        assigned_at: new Date().toISOString(),
        assigned_by: user.id
      })
  }

  const removeScrutineer = async (scrutineerId: string) => {
    await supabase
      .from('booking_scrutineers')
      .delete()
      .eq('booking_id', bookingId)
      .eq('scrutineer_id', scrutineerId)
  }

  return {
    assignedScrutineers,
    availableScrutineers,
    assignScrutineer,
    removeScrutineer
  }
}
```

### 6. Production Deployment Strategy

#### Environment Configuration
```typescript
// src/lib/config.ts
export const config = {
  database: {
    url: process.env.DATABASE_URL!,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000')
  },
  redis: {
    url: process.env.REDIS_URL!,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100
  },
  storage: {
    bucket: process.env.STORAGE_BUCKET!,
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['image/*', 'application/pdf']
  },
  realtime: {
    enabled: process.env.REALTIME_ENABLED === 'true',
    heartbeatInterval: parseInt(process.env.REALTIME_HEARTBEAT || '30000')
  }
}
```

#### Monitoring and Alerting
```typescript
// src/lib/monitoring.ts
export class MonitoringService {
  static async trackInspectionProgress(bookingId: string, action: string) {
    // Track metrics for monitoring
    await fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'inspection_progress',
        bookingId,
        action,
        timestamp: new Date().toISOString()
      })
    })
  }

  static async alertOnFailure(bookingId: string, error: Error) {
    // Send alerts for critical failures
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'inspection_failure',
        bookingId,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    })
  }
}
```

## Scaling Recommendations

### Immediate Actions (Week 1)
1. **Fix Schema Mismatch**: Apply migration 004_optimized_schema.sql
2. **Implement Robust Hooks**: Deploy useInspectionStatus and useChecklistManager
3. **Add Critical Indexes**: Apply performance indexes
4. **Enable Real-time**: Implement WebSocket subscriptions

### Short-term (Month 1)
1. **File Upload System**: Implement secure file attachments
2. **Conflict Resolution**: Add multi-user conflict handling
3. **Caching Layer**: Implement Redis caching
4. **Audit Trail**: Deploy comprehensive logging

### Long-term (Quarter 1)
1. **Microservices**: Split into inspection, scoring, and admin services
2. **CDN Integration**: Optimize file delivery
3. **Advanced Analytics**: Implement inspection analytics dashboard
4. **Mobile App**: Develop companion mobile application

## Performance Benchmarks

### Target Metrics
- **Page Load Time**: < 2 seconds
- **Checklist Update Latency**: < 500ms
- **Concurrent Users**: 100+ simultaneous inspections
- **Database Query Time**: < 100ms for 95th percentile
- **File Upload Time**: < 5 seconds for 10MB files

### Monitoring KPIs
- Inspection completion rate
- Average inspection duration
- System uptime (99.9% target)
- Error rate (< 0.1% target)
- User satisfaction scores

This architecture provides a solid foundation for scaling your Formula IHU Competition Management Hub to handle large-scale events with hundreds of teams and multiple concurrent inspections.
