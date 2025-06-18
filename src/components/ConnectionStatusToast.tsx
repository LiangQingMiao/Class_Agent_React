import React from 'react';

interface Props {
  show: boolean;
  text?: string;
}

const ConnectionStatusToast: React.FC<Props> = ({ show, text }) => {
  if (!show) return null;
  return (
    <div className="fixed right-6 bottom-6 z-50">
      <div className="bg-red-500 dark:bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg animate-bounce transition-colors duration-200">
        {text || '未连接后端服务'}
      </div>
    </div>
  );
};

export default ConnectionStatusToast; 