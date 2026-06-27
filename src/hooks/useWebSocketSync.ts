import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboardStats } from '@/store/slices/reportsSlice';
import { fetchSales } from '@/store/slices/salesSlice';
import { fetchPurchases } from '@/store/slices/purchasesSlice';
import { fetchParties } from '@/store/slices/partySlice';
import { fetchDues } from '@/store/slices/duesSlice';
import type { RootState, AppDispatch } from '@/store';
import { BASE_URL } from '@/config/api'; // Ensure you have this or use your api constant

export const useWebSocketSync = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, token } = useSelector((state: RootState) => state.auth);
  const stompClient = useRef<Client | null>(null);

  useEffect(() => {
    if (!user || !user.entityId || !token) return;

    // Convert HTTP BASE_URL to WS URL
    const wsProtocol = BASE_URL.startsWith('https') ? 'wss://' : 'ws://';
    const host = BASE_URL.replace('http://', '').replace('https://', '');
    const wsUrl = `${wsProtocol}${host}/ws`;

    stompClient.current = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    stompClient.current.onConnect = () => {
      console.log('WebSocket Connected');
      stompClient.current?.subscribe(`/topic/updates/${user.entityId}`, (message) => {
        if (message.body) {
          try {
            const data = JSON.parse(message.body);
            console.log('WebSocket Received:', data);
            
            if (data.action === 'REFRESH') {
              // Silently refresh the critical Redux slices
              dispatch(fetchDashboardStats());
              if (data.type === 'SALE' || data.type === 'PAYMENT') dispatch(fetchSales());
              if (data.type === 'PURCHASE' || data.type === 'PAYMENT') dispatch(fetchPurchases());
              if (data.type === 'PARTY') dispatch(fetchParties({}));
              if (data.type === 'PAYMENT' || data.type === 'SALE' || data.type === 'PURCHASE') dispatch(fetchDues({}));
            }
          } catch (e) {
            console.error('Error parsing WebSocket message', e);
          }
        }
      });
    };

    stompClient.current.onStompError = (frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    };

    stompClient.current.activate();

    return () => {
      if (stompClient.current) {
        stompClient.current.deactivate();
      }
    };
  }, [user?.entityId, token, dispatch]);
};
