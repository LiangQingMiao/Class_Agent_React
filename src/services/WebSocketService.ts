import { useState, useEffect, useCallback } from 'react';

type Mode = 'PPT更新' | '教案编写' | '教材拷问';

interface MessageData {
  type: 'message' | 'file';
  content: string;
  filename?: string;
  mode: Mode;
  timestamp: string;
  fileData?: string | null; // base64编码的文件数据
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 3000;
  private messageQueue: string[] = [];
  private isConnecting = false;
  private messageHandlers: Set<(data: any) => void> = new Set();
  private connectionStatusCallbacks: Set<(status: 'connected' | 'disconnected') => void> = new Set();

  constructor() {
    this.connect();
  }

  private connect() {
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      // 确保关闭现有连接
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }

      this.ws = new WebSocket('ws://localhost:8765');

      this.ws.onopen = () => {
        console.log('WebSocket连接已建立');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.processMessageQueue();
        this.notifyConnectionStatus('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('收到消息:', data);
          this.messageHandlers.forEach(handler => handler(data));
        } catch (error) {
          console.error('解析消息失败:', error);
          this.messageHandlers.forEach(handler => handler(event.data));
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket连接已关闭');
        this.isConnecting = false;
        this.notifyConnectionStatus('disconnected');
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket错误:', error);
        this.isConnecting = false;
        this.notifyConnectionStatus('disconnected');
      };
    } catch (error) {
      console.error('创建WebSocket连接失败:', error);
      this.isConnecting = false;
      this.notifyConnectionStatus('disconnected');
      this.handleReconnect();
    }
  }

  private notifyConnectionStatus(status: 'connected' | 'disconnected') {
    this.connectionStatusCallbacks.forEach(callback => callback(status));
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.connect(), this.reconnectTimeout);
    } else {
      console.error('达到最大重连次数，停止重连');
    }
  }

  private processMessageQueue() {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift()!;
      this.send(message);
    }
  }

  public sendMessage(mode: Mode, data: { text: string; file?: { name: string; type: string; size: number; data: ArrayBuffer } | null }): Promise<void> {
    return new Promise((resolve, reject) => {
      if (data.file) {
        const blob = new Blob([data.file.data]);
        const reader = new FileReader();
        reader.onload = () => {
          const base64Data = reader.result as string;
          const message = {
            text: data.text,
            fileData: base64Data,
            filename: data.file?.name,
            fileType: data.file?.type,
            fileSize: data.file?.size
          };
          
          console.log('准备发送的消息:', {
            text: message.text,
            filename: message.filename,
            fileType: message.fileType,
            fileSize: message.fileSize,
            hasFileData: !!message.fileData
          });
          
          try {
            this.send(JSON.stringify(message));
            resolve();
          } catch (error) {
            console.error('发送消息失败:', error);
            reject(error);
          }
        };
        reader.readAsDataURL(blob);
      } else {
        const message = {
          text: data.text,
          fileData: null,
          filename: null,
          fileType: null,
          fileSize: null
        };
        
        console.log('准备发送的消息:', {
          text: message.text,
          filename: message.filename,
          fileType: message.fileType,
          fileSize: message.fileSize,
          hasFileData: false
        });
        
        try {
          this.send(JSON.stringify(message));
          resolve();
        } catch (error) {
          console.error('发送消息失败:', error);
          reject(error);
        }
      }
    });
  }

  private send(data: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('发送消息:', data);
      this.ws.send(data);
    } else {
      console.log('WebSocket未连接，消息已加入队列');
      this.messageQueue.push(data);
      if (!this.isConnecting) {
        this.connect();
      }
    }
  }

  public addMessageHandler(handler: (data: any) => void) {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  public addConnectionStatusCallback(callback: (status: 'connected' | 'disconnected') => void) {
    this.connectionStatusCallbacks.add(callback);
    return () => {
      this.connectionStatusCallbacks.delete(callback);
    };
  }

  public getConnectionStatus(): 'connected' | 'disconnected' {
    return this.ws?.readyState === WebSocket.OPEN ? 'connected' : 'disconnected';
  }

  public close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const useWebSocket = (mode: Mode) => {
  const [status, setStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [wsService] = useState(() => new WebSocketService());

  useEffect(() => {
    const removeStatusCallback = wsService.addConnectionStatusCallback((newStatus) => {
      setStatus(newStatus);
    });

    setStatus(wsService.getConnectionStatus());

    return () => {
      removeStatusCallback();
    };
  }, [wsService]);

  return { wsService, status };
};