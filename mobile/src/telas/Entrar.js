import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Botao, Campo, Erro, Painel, cores, estilos } from '../componentes/UI';
import { entrar } from '../sessao';

export default function Entrar({ aoEntrar }) {
  const [criarConta, setCriarConta] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  async function enviar() {
    setErro('');
    setEnviando(true);
    try {
      aoEntrar(await entrar(email, senha, criarConta));
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
        <Painel>
          <Text style={[estilos.titulo, { color: cores.primaria, textAlign: 'center' }]}>Cofrinho Invista+</Text>
          <Text style={[estilos.suave, { textAlign: 'center' }]}>Educação financeira começa com bons hábitos. Acompanhe suas economias e planeje seus próximos aportes.</Text>
          <View style={{ flexDirection: 'row', backgroundColor: '#eef2f7', borderRadius: 10, padding: 4 }}>
            {[['Entrar', false], ['Criar conta', true]].map(([rotulo, valor]) => (
              <Pressable
                key={rotulo}
                accessibilityRole="tab"
                onPress={() => setCriarConta(valor)}
                style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: criarConta === valor ? '#fff' : 'transparent' }}
              >
                <Text style={{ textAlign: 'center', fontWeight: '700', color: criarConta === valor ? cores.primaria : cores.suave }}>{rotulo}</Text>
              </Pressable>
            ))}
          </View>
          <Campo rotulo="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <Campo rotulo="Senha" value={senha} onChangeText={setSenha} secureTextEntry autoComplete={criarConta ? 'new-password' : 'password'} />
          {criarConta && <Text style={estilos.suave}>Use ao menos 8 caracteres. A conta deve ser do responsável.</Text>}
          <Erro mensagem={erro} />
          <Botao titulo={criarConta ? 'Criar conta' : 'Entrar'} aoTocar={enviar} carregando={enviando} desativado={!email || !senha} />
        </Painel>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
