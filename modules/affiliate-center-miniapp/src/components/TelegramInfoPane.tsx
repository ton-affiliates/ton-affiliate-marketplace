import React from 'react';


interface TelegramInfoPaneProps {
  userInfo: Record<string, any> | null;
  initData: string | null;
  initDataUnsafe: Record<string, any> | null;
}

const TelegramInfoPane: React.FC<TelegramInfoPaneProps> = ({ userInfo, initData, initDataUnsafe }) => {
  console.log("Received in TelegramInfoPane:");
  console.log("userInfo:", userInfo);
  console.log("initData:", initData);
  console.log("initDataUnsafe:", initDataUnsafe);

  const renderData = (title: string, data: Record<string, any> | string | null) => {
    if (!data) {
      console.log(`${title} is null or undefined`);
      return <p>No {title} available.</p>;
    }

    if (typeof data === 'string') {
      return (
        <div className="telegram-pane-section">
          <h3 className="telegram-pane-title">{title}</h3>
          <div className="telegram-pane-value">{data}</div>
        </div>
      );
      
    }

    if (typeof data === 'object' && Object.keys(data).length > 0) {
      return (
        <div className="telegram-pane-section">
          <h3 className="telegram-pane-title">{title}</h3>
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="telegram-pane-item">
              <span className="telegram-pane-key">{key}:</span>
              <span className="telegram-pane-value">{String(value)}</span>
            </div>
          ))}
        </div>
      );

    }

    console.log(`${title} is an empty object or not a valid type`);
    return <p>No {title} data available.</p>;
  };

  return (
    <div className="telegram-pane">
      {renderData('User Info', userInfo)}
      {renderData('Init Data', initData)}
      {renderData('Init Data Unsafe', initDataUnsafe)}
    </div>




    
  );
};

export default TelegramInfoPane;
