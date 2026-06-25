# selvans-angular-demo

Angular standalone application that demonstrates `selvans-angular`.

> Generated with `nx generate @nx/angular:app selvans-angular-demo`

Key integration:

```typescript
// main.ts
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
```

> **NgModule apps:** if your project uses `@NgModule`, use `SelvansModule.forRoot(config)` instead (see the library reference).

Standalone components import directives and the panel directly:

```typescript
// app.component.ts
@Component({
  standalone: true,
  imports: [SelvansNodeDirective, SelvansTargetDirective, SelvansPanelComponent],
  ...
})
export class AppComponent {}
```

```html
<!-- app.component.html -->
<nav [SelvansNode]="{ id: 'main-nav', template: 'menu', description: 'Top navigation' }">
  <a [SelvansNode]="{ id: 'nav-home', description: 'Home', actions: ['click'] }"
     [SelvansTarget]="'nav-home'" routerLink="/">Home</a>
</nav>

<main [SelvansNode]="{ id: 'home-page', template: 'page', route: '/', description: 'Home page' }">
  <button [SelvansTarget]="'hero-cta'"
          [SelvansNode]="{ id: 'hero-cta', description: 'Get started CTA', actions: ['click'] }">
    Get Started
  </button>
</main>

<selvans-panel />
```
