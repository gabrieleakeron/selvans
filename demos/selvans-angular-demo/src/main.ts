import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { provideSelvans } from 'selvans-angular';

const coreUrl: string = (window as unknown as Record<string, unknown>)['__Selvans_CORE_URL__'] as string
  ?? 'http://localhost:8080';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideSelvans({
      coreUrl,
      appId: 'selvans-angular-demo',
    }),
  ],
}).catch(console.error);
