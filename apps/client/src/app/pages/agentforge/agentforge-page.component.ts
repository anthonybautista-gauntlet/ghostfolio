import { UserService } from '@ghostfolio/client/services/user/user.service';
import { Filter, User } from '@ghostfolio/common/interfaces';
import { DataService } from '@ghostfolio/ui/services';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface ChatMessage {
  content: string;
  disclaimer?: string;
  role: 'assistant' | 'user';
}

@Component({
  host: { class: 'page' },
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule
  ],
  selector: 'gf-agentforge-page',
  styleUrls: ['./agentforge-page.component.scss'],
  templateUrl: './agentforge-page.component.html'
})
export class GfAgentForgePageComponent implements OnDestroy, OnInit {
  private hasRestoredSession = false;
  public isLoading = false;
  public messages: ChatMessage[] = [];
  public prompt = '';
  public sessionId: string | undefined;
  public user: User;
  @ViewChild('messagesContainer')
  private messagesContainerRef?: ElementRef<HTMLDivElement>;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private userService: UserService
  ) {}

  public ngOnInit() {
    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;
          if (!this.hasRestoredSession) {
            this.restoreMostRecentSession();
          }
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  public onPromptKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }

  public onSend() {
    const message = this.prompt.trim();

    if (!message || this.isLoading) {
      return;
    }

    const filters: Filter[] = this.userService.getFilters();

    this.messages.push({
      content: message,
      role: 'user'
    });
    this.prompt = '';
    this.isLoading = true;
    this.scrollMessagesToBottom();

    this.dataService
      .postAiChat({
        filters,
        message,
        sessionId: this.sessionId
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe({
        next: ({ disclaimer, message: assistantMessage, sessionId }) => {
          this.sessionId = sessionId;
          this.messages.push({
            content: assistantMessage,
            disclaimer,
            role: 'assistant'
          });
          this.isLoading = false;
          this.scrollMessagesToBottom();
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.messages.push({
            content:
              'The assistant is temporarily unavailable. Please try again in a moment.',
            role: 'assistant'
          });
          this.isLoading = false;
          this.scrollMessagesToBottom();
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public onNewChat() {
    if (this.isLoading) {
      return;
    }

    this.messages = [];
    this.prompt = '';
    this.sessionId = undefined;
    this.changeDetectorRef.markForCheck();
  }

  private restoreMostRecentSession() {
    this.hasRestoredSession = true;

    this.dataService
      .getAiChatSession()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe({
        next: ({ messages, sessionId }) => {
          this.messages = messages.map(({ content, role }) => ({
            content,
            role
          }));
          this.sessionId = sessionId;
          this.scrollMessagesToBottom();
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.sessionId = undefined;
          this.messages = [];
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  private scrollMessagesToBottom() {
    setTimeout(() => {
      const container = this.messagesContainerRef?.nativeElement;

      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 0);
  }
}
