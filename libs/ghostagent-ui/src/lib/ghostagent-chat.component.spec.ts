import { DataService } from '@ghostfolio/ui/services';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { GfGhostAgentChatComponent } from './ghostagent-chat.component';

describe('GfGhostAgentChatComponent', () => {
  let component: GfGhostAgentChatComponent;
  let fixture: ComponentFixture<GfGhostAgentChatComponent>;
  let dataService: {
    getAiChatSession: jest.Mock;
    getAiModelPreference: jest.Mock;
    postAiChat: jest.Mock;
    updateAiModelPreference: jest.Mock;
  };

  beforeEach(async () => {
    dataService = {
      getAiChatSession: jest.fn().mockReturnValue(
        of({
          messages: [],
          sessionId: undefined
        })
      ),
      getAiModelPreference: jest.fn().mockReturnValue(
        of({
          availableModels: ['anthropic/claude-sonnet-4.5'],
          selectedModel: 'anthropic/claude-sonnet-4.5'
        })
      ),
      postAiChat: jest.fn().mockReturnValue(
        of({
          confidence: 'medium',
          disclaimer: 'Not Financial Advice',
          message: 'ok',
          sessionId: 'session-id',
          citedFigures: [],
          timings: {
            llmMs: 1,
            toolsMs: 1,
            totalMs: 2
          },
          toolInvocations: [],
          verification: {
            failedCitations: [],
            passed: true
          }
        })
      ),
      updateAiModelPreference: jest.fn().mockReturnValue(
        of({
          availableModels: ['anthropic/claude-sonnet-4.5'],
          selectedModel: 'anthropic/claude-sonnet-4.5'
        })
      )
    };

    await TestBed.configureTestingModule({
      imports: [GfGhostAgentChatComponent],
      providers: [{ provide: DataService, useValue: dataService }]
    }).compileComponents();

    fixture = TestBed.createComponent(GfGhostAgentChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows thinking indicator when loading', () => {
    component.isLoading = true;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Thinking...');
  });

  it('sends selected model with chat request payload', () => {
    component.selectedModel = 'anthropic/claude-sonnet-4.5';
    component.prompt = 'What is my balance?';

    component.onSend();

    expect(dataService.postAiChat).toHaveBeenCalledWith({
      message: 'What is my balance?',
      selectedModel: 'anthropic/claude-sonnet-4.5',
      sessionId: undefined
    });
  });
});
