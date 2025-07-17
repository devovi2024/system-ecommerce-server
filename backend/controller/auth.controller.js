import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';
import redis from '../lib/redis.js';

// Token expiry times
const FOUR_MONTHS_IN_SECONDS = 60 * 60 * 24 * 30 * 4; 
const ACCESS_TOKEN_EXPIRE = '25m'; 

// Generate JWT tokens
const generateToken = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRE,
  });

  const refreshToken = jwt.sign({ id: userId }, process.env.REFRESH_SECRET, {
    expiresIn: `${FOUR_MONTHS_IN_SECONDS}s`,
  });

  return { accessToken, refreshToken };
};

// Store refresh token in Redis
const storeRefreshToken = async (userId, token) => {
  await redis.set(`refresh_token:${userId}`, token, 'EX', FOUR_MONTHS_IN_SECONDS);
};

export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    const user = await User.create({ name, email, password });

    const { accessToken, refreshToken } = generateToken(user._id);
    await storeRefreshToken(user._id, refreshToken);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: FOUR_MONTHS_IN_SECONDS * 1000,
    });

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 25 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
    });
  } catch (error) {
    console.error('Signup error:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({ success: false, message: "Incorrect password" });
    }

    const { accessToken, refreshToken } = generateToken(user._id);
    await storeRefreshToken(user._id, refreshToken);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: FOUR_MONTHS_IN_SECONDS * 1000,
    });

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 25 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// LOGOUT
export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'No refresh token found in cookies' });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    await redis.del(`refresh_token:${decoded.id}`);

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return res.status(200).json({ success: true, message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// REFRESH ACCESS TOKEN
export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'No refresh token found in cookies',
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    const storedToken = await redis.get(`refresh_token:${decoded.id}`);

    if (storedToken !== refreshToken) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const accessToken = jwt.sign({ id: decoded.id }, process.env.JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRE,
    });

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 25 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      accessToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


export const getProfile = async (req, res) => {
  try {
    const user = req.user;
    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role, 
      }
    });
  } catch (error) {
    console.error('Error in getProfile:', error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
