import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { useUserRole } from "../UserRoleContext";
import { TelegramContext } from '../TelegramContext';
import useScrollToTop from '../hooks/scrollToStart';

interface MainScreenProps {
    setScreen: React.Dispatch<React.SetStateAction<'main' | 'advertiser' | 'campaign' | 'status' | 'setupTelegram'>>;
}

const MainScreen: React.FC<MainScreenProps> = ({ setScreen }) => {

    const { setUserRole } = useUserRole();
    const { userInfo } = useContext(TelegramContext);
    const handleRoleSelection = (role: "Advertiser" | "Affiliate") => {
      setUserRole(role);
      // Navigate to the next screen here
    };

    useScrollToTop();
    return (
        <motion.div
            className="screen-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="card">
            
                <h1>Hi {userInfo && userInfo.firstName ? userInfo.firstName : 'There'}!</h1>
                <p>
                    Are you an Affiliate looking for active campaigns or 
                    An Advertiser looking to set up a referral campaign?
                </p>
                <div className="button-group">
                    <button
                        className="custom-button"
                        onClick={() => {handleRoleSelection("Advertiser"); setScreen('advertiser')}}
                    >
                        Advertiser
                    </button>
                    <button
                        className="custom-button"
                        onClick={() => {handleRoleSelection("Affiliate"); setScreen('status')}}
                    >
                        Affiliate
                    </button>
                </div>
            </div>

            {/* <div>
                <h1>Telegram Info</h1>
                {userInfo ? (
                    <div>
                    <p>
                        <strong>Name:</strong> {userInfo.firstName} {userInfo.lastName || ""}
                    </p>
                    <p>
                        <strong>Username:</strong> @{userInfo.username}
                    </p>
                    <p>
                        <strong>Language:</strong> {userInfo.languageCode}
                    </p>
                    </div>
                ) : (
                    <p>Loading Telegram data...</p>
                )}
                <p>
                    <strong>Init Data:</strong> {initData}
                </p>
                <p>
                    <strong>Init Data Unsafe:</strong> {JSON.stringify(initDataUnsafe, null, 2)}
                </p>
            </div> */}

            {/* TELEGRAM INFO!!!!!!!!!!!!! */}
            {/* {userInfo && (
            <div style={{ padding: '16px' }}>
                <div className="card">
                    <h2>Telegram Info</h2>
                    <TelegramInfoPane
                        userInfo={userInfo}
                        initData={initData}
                        initDataUnsafe={initDataUnsafe}
                    />
                </div>
            </div>)} */}
        </motion.div>
    );
};

export default MainScreen;