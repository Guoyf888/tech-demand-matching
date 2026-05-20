/**
 * EventBus - 轻量级类型化事件总线
 *
 * 参考 OpenHuman 的 event_bus 模式，用于跨服务解耦通信
 *
 * 用法：
 *   const unsub = eventBus.on('skill.executed', (data) => console.log(data));
 *   await eventBus.emit({ type: 'skill.executed', payload: { skillName: 'x' }, timestamp: new Date().toISOString(), source: 'UnifiedSkillService' });
 *   unsub(); // 取消订阅
 */

type EventHandler<T = unknown> = (data: T) => void | Promise<void>;

export interface DomainEvent {
  type: string;
  payload: unknown;
  timestamp: string;
  source: string;
}

class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  /**
   * 订阅事件，返回取消订阅函数
   */
  on<T = unknown>(eventType: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler);
    return () => {
      this.handlers.get(eventType)?.delete(handler as EventHandler);
    };
  }

  /**
   * 一次性订阅
   */
  once<T = unknown>(eventType: string, handler: EventHandler<T>): () => void {
    const wrappedHandler: EventHandler<T> = (data) => {
      unsub();
      return handler(data);
    };
    const unsub = this.on<T>(eventType, wrappedHandler);
    return unsub;
  }

  /**
   * 触发事件
   */
  async emit(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.type);
    if (!handlers || handlers.size === 0) return;

    const promises: Promise<void>[] = [];
    for (const handler of handlers) {
      try {
        const result = handler(event.payload);
        if (result instanceof Promise) {
          promises.push(result.catch(err => {
            console.error(`[EventBus] Handler error for ${event.type}:`, err);
          }));
        }
      } catch (err) {
        console.error(`[EventBus] Handler error for ${event.type}:`, err);
      }
    }

    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }
  }

  /**
   * 清除所有监听器
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * 清除特定事件的监听器
   */
  clearEvent(eventType: string): void {
    this.handlers.delete(eventType);
  }
}

// 全局单例
export const eventBus = new EventBus();

// ============================================
// 预定义事件类型常量
// ============================================

export const EventTypes = {
  // 技能事件
  SKILL_EXECUTED: 'skill.executed',
  SKILL_MATCHED: 'skill.matched',

  // 意图事件
  INTENT_CLASSIFIED: 'intent.classified',

  // Agent 事件
  AGENT_TASK_START: 'agent.task.start',
  AGENT_TASK_END: 'agent.task.end',
  AGENT_TOOL_CALL: 'agent.tool.call',

  // 错误事件
  ERROR_SKILL: 'error.skill',
  ERROR_TOOL: 'error.tool',
} as const;
