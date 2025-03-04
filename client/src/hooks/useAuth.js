import { useContext } from 'react';
import { AuthContext } from '../contexts/authContext.jsx';

const useAuth = () => {
    return useContext(AuthContext);
};

export default useAuth;
