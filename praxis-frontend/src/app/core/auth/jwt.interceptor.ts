import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenStorageService } from './token-storage.service';
import {environment} from '../../../environments/environment';

const API_BASE = environment.apiUrl
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(TokenStorageService).token;

  const isBackendCall = (!!API_BASE && req.url.startsWith(API_BASE)) || req.url.startsWith('/api/');
  if (!isBackendCall) {
    return next(req);
  }
  // Login-Call nicht anfassen (optional)
  if (!token || req.url.includes('/api/auth/login')) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  });

  return next(authReq);
};
