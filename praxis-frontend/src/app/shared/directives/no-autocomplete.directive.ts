import { Directive, ElementRef, OnInit, Renderer2 } from '@angular/core';

@Directive({
  selector: 'input[matInput], textarea[matInput]',
  standalone: true,
})
export class NoAutocompleteDirective implements OnInit {
  private readonly id = Math.random().toString(36).slice(2);

  constructor(private el: ElementRef<HTMLInputElement | HTMLTextAreaElement>, private renderer: Renderer2) {}

  ngOnInit() {
    const element = this.el.nativeElement;

    this.renderer.setAttribute(element, 'autocomplete', 'off');
    this.renderer.setAttribute(element, 'autocorrect', 'off');
    this.renderer.setAttribute(element, 'autocapitalize', 'off');
    this.renderer.setAttribute(element, 'spellcheck', 'false');
    this.renderer.setAttribute(element, 'aria-autocomplete', 'none');

    const currentName = element.getAttribute('name');
    if (currentName) {
      this.renderer.setAttribute(element, 'data-original-name', currentName);
      this.renderer.setAttribute(element, 'name', `noauto-${this.id}`);
    }
  }
}
