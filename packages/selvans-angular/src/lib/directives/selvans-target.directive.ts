import { Directive, ElementRef, Input, OnInit } from '@angular/core';

/**
 * Marks a DOM element as addressable by AI agents.
 *
 * Usage:
 *   <button [SelvansTarget]="'submit-order'">Place Order</button>
 *
 * The AI can then call `click_element` with targetId: "submit-order".
 */
@Directive({
  selector: '[SelvansTarget]',
  standalone: true,
})
export class SelvansTargetDirective implements OnInit {
  @Input({ required: true }) SelvansTarget!: string;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    this.el.nativeElement.setAttribute('data-selvans', this.SelvansTarget);
  }
}
