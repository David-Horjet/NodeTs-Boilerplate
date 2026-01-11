import { Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

/**
 * Sign up new user
 */
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: 'Account created successfully',
      user: data.user,
      session: data.session
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Login
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    res.json({
      message: 'Logged in successfully',
      user: data.user,
      session: data.session
    });
  } catch (error) {
    next(error);
  }
});

export default router;