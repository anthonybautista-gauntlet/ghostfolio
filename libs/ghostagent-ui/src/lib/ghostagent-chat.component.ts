import { DataService } from '@ghostfolio/ui/services';

import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
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
import { MatSelectModule } from '@angular/material/select';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface ChatMessage {
  content: string;
  feedbackComment?: string;
  feedbackError?: string;
  feedbackRating?: 'down' | 'up';
  feedbackSubmitted?: boolean;
  feedbackSubmitting?: boolean;
  disclaimer?: string;
  model?: string;
  query?: string;
  role: 'assistant' | 'user';
  toolInvocations?: unknown[];
  verification?: unknown;
}

@Component({
  host: { class: 'page' },
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  selector: 'gf-ghostagent-chat',
  styleUrls: ['./ghostagent-chat.component.scss'],
  templateUrl: './ghostagent-chat.component.html'
})
export class GfGhostAgentChatComponent implements OnDestroy, OnInit {
  private hasRestoredSession = false;
  private readonly maxRestoreAttempts = 5;
  private restoreAttempts = 0;
  public availableModels: string[] = [];
  public isLoading = false;
  public isModelPreferenceLoading = false;
  public isModelPreferenceSaving = false;
  public messages: ChatMessage[] = [];
  public prompt = '';
  public selectedModel: string | undefined;
  public sessionId: string | undefined;
  @ViewChild('messagesContainer')
  private messagesContainerRef?: ElementRef<HTMLDivElement>;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService
  ) {}

  public ngOnInit() {
    this.loadModelPreference();

    if (!this.hasRestoredSession) {
      this.restoreMostRecentSession();
    }
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

    this.messages.push({
      content: message,
      role: 'user'
    });
    this.prompt = '';
    this.isLoading = true;
    this.scrollMessagesToBottom();

    this.dataService
      .postAiChat({
        message,
        selectedModel: this.selectedModel,
        sessionId: this.sessionId
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe({
        next: ({
          disclaimer,
          message: assistantMessage,
          sessionId,
          toolInvocations,
          verification
        }) => {
          this.sessionId = sessionId;
          this.messages.push({
            content: assistantMessage,
            disclaimer,
            model: this.selectedModel,
            query: message,
            role: 'assistant',
            toolInvocations,
            verification
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

  public onSelectedModelChange(selectedModel: string) {
    this.selectedModel = selectedModel;
    this.isModelPreferenceSaving = true;

    this.dataService
      .updateAiModelPreference({
        selectedModel
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe({
        next: ({ selectedModel: persistedSelectedModel }) => {
          this.selectedModel = persistedSelectedModel;
          this.isModelPreferenceSaving = false;
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.isModelPreferenceSaving = false;
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public onSelectFeedback({
    index,
    rating
  }: {
    index: number;
    rating: 'down' | 'up';
  }) {
    const message = this.messages[index];

    if (!message || message.role !== 'assistant' || message.feedbackSubmitted) {
      return;
    }

    message.feedbackError = undefined;
    message.feedbackRating = rating;
    if (rating === 'up') {
      message.feedbackComment = '';
      this.submitFeedback({ index });
    }

    this.changeDetectorRef.markForCheck();
  }

  public submitFeedback({ index }: { index: number }) {
    const message = this.messages[index];

    if (
      !message ||
      message.role !== 'assistant' ||
      !message.feedbackRating ||
      message.feedbackSubmitted ||
      !this.sessionId
    ) {
      return;
    }

    message.feedbackError = undefined;
    message.feedbackSubmitting = true;

    this.dataService
      .postAiFeedback({
        assistantReply: message.content,
        comment: message.feedbackComment?.trim(),
        model: message.model,
        query: message.query ?? '',
        rating: message.feedbackRating,
        sessionId: this.sessionId,
        toolInvocations: message.toolInvocations,
        verification: message.verification
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe({
        next: () => {
          message.feedbackSubmitted = true;
          message.feedbackSubmitting = false;
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          message.feedbackError =
            'Unable to submit feedback right now. Please try again.';
          message.feedbackSubmitting = false;
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  private restoreMostRecentSession() {
    this.hasRestoredSession = true;
    this.restoreAttempts += 1;

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
          this.restoreAttempts = 0;
          this.scrollMessagesToBottom();
          this.changeDetectorRef.markForCheck();
        },
        error: (error: unknown) => {
          if (
            this.shouldRetryRestore({
              attempt: this.restoreAttempts,
              error
            })
          ) {
            setTimeout(() => {
              this.restoreMostRecentSession();
            }, 250 * this.restoreAttempts);
            return;
          }

          this.restoreAttempts = 0;
          this.sessionId = undefined;
          this.messages = [];
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  private loadModelPreference() {
    this.isModelPreferenceLoading = true;

    this.dataService
      .getAiModelPreference()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe({
        next: ({ availableModels, selectedModel }) => {
          this.availableModels = availableModels;
          this.selectedModel = selectedModel ?? availableModels[0];
          this.isModelPreferenceLoading = false;
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.availableModels = [];
          this.selectedModel = undefined;
          this.isModelPreferenceLoading = false;
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  private shouldRetryRestore({
    attempt,
    error
  }: {
    attempt: number;
    error: unknown;
  }) {
    if (attempt >= this.maxRestoreAttempts) {
      return false;
    }

    if (error instanceof HttpErrorResponse) {
      return [0, 401, 403].includes(error.status);
    }

    return false;
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
