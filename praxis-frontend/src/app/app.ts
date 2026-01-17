import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ConsentOverlayComponent } from './shared/consent-overlay/consent-overlay.component';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, ConsentOverlayComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('praxis-frontend');

  constructor(private readonly router: Router) {}

  get showConsentOverlay(): boolean {
    return this.router.url.startsWith('/form');
  }
}
